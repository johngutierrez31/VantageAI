import { spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const requestedBaseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const serverScript = process.env.APP_SERVER_SCRIPT ?? (process.env.CI ? 'start' : 'dev');
const outputDir = path.join(process.cwd(), 'output');
const serverStdoutPath = path.join(outputDir, 'full-validation-server.stdout.log');
const serverStderrPath = path.join(outputDir, 'full-validation-server.stderr.log');

function log(message: string) {
  process.stdout.write(`[full-validation] ${message}\n`);
}

function quoteWindowsArg(arg: string) {
  if (!/[ \t"&()^<>|]/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

function spawnNpm(
  args: string[],
  stdio: 'inherit' | ['ignore', 'pipe', 'pipe'],
  envOverrides?: Record<string, string>
) {
  const childEnv = {
    ...process.env,
    ...envOverrides
  };

  if (process.platform === 'win32') {
    const commandLine = [npmCommand, ...args].map(quoteWindowsArg).join(' ');
    return spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', commandLine], {
      cwd: process.cwd(),
      env: childEnv,
      stdio
    });
  }

  return spawn(npmCommand, args, {
    cwd: process.cwd(),
    env: childEnv,
    stdio
  });
}

async function ensureOutputDir() {
  await fs.mkdir(outputDir, { recursive: true });
}

async function runNpmScript(args: string[], label: string, envOverrides?: Record<string, string>) {
  log(`running ${label}`);
  await new Promise<void>((resolve, reject) => {
    const child = spawnNpm(args, 'inherit', envOverrides);

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} failed with exit code ${code ?? 'unknown'}`));
    });
  });
}

async function waitForUrl(urls: string[], timeoutMs: number) {
  const startedAt = Date.now();
  let lastError = 'No response received';

  while (Date.now() - startedAt < timeoutMs) {
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) return;
        lastError = `${url} returned ${response.status}`;
      } catch (error) {
        lastError = `${url}: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for server readiness: ${lastError}`);
}

async function isPortAvailable(port: number) {
  return new Promise<boolean>((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function resolveBaseUrl() {
  const parsed = new URL(requestedBaseUrl);
  const requestedPort = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80));

  for (let offset = 0; offset < 10; offset += 1) {
    const candidatePort = requestedPort + offset;
    if (await isPortAvailable(candidatePort)) {
      parsed.port = String(candidatePort);
      return parsed.toString().replace(/\/$/, '');
    }
  }

  throw new Error(`Unable to find an open port near ${requestedPort} for full validation.`);
}

async function waitForProcessExit(child: ChildProcess, timeoutMs: number) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return true;
  }

  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      child.off('exit', handleExit);
      resolve(false);
    }, timeoutMs);

    function handleExit() {
      clearTimeout(timer);
      resolve(true);
    }

    child.once('exit', handleExit);
  });
}

async function terminateProcessTree(child: ChildProcess) {
  if (!child.pid) return;

  if (process.platform === 'win32') {
    await new Promise<void>((resolve, reject) => {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore'
      });

      killer.on('error', reject);
      killer.on('exit', (code) => {
        if (code === 0 || code === 128) {
          resolve();
          return;
        }

        reject(new Error(`taskkill failed with exit code ${code ?? 'unknown'}`));
      });
    });
    return;
  }

  child.kill('SIGTERM');
  const exitedAfterSigterm = await waitForProcessExit(child, 5_000);
  if (!exitedAfterSigterm) {
    child.kill('SIGKILL');
    await waitForProcessExit(child, 5_000);
  }
}

async function startServer(baseUrl: string, envOverrides: Record<string, string> = {}) {
  await ensureOutputDir();
  const stdoutStream = createWriteStream(serverStdoutPath, { flags: 'w' });
  const stderrStream = createWriteStream(serverStderrPath, { flags: 'w' });
  const parsed = new URL(baseUrl);
  const port = parsed.port || '3000';
  const serverEnvOverrides = { BASE_URL: baseUrl, ...envOverrides };
  const serverArgs =
    serverScript === 'start'
      ? ['run', 'start', '--', '--hostname', '127.0.0.1', '--port', port]
      : ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', port];

  log(`starting ${serverScript} server`);
  const child = spawnNpm(serverArgs, ['ignore', 'pipe', 'pipe'], serverEnvOverrides);

  child.stdout?.pipe(stdoutStream);
  child.stderr?.pipe(stderrStream);

  child.on('exit', (code) => {
    log(`dev server exited with code ${code ?? 'unknown'}`);
  });

  await waitForUrl([`${baseUrl}/app/tools`, `${baseUrl}/login`], 120_000);
  return child;
}

async function main() {
  let server: ChildProcess | null = null;
  let primaryError: unknown = null;
  const baseUrl = await resolveBaseUrl();
  const envOverrides = { BASE_URL: baseUrl };
  const demoValidationEnv = {
    DEMO_MODE: process.env.DEMO_MODE ?? 'true',
    DEMO_BYPASS_ENABLED: process.env.DEMO_BYPASS_ENABLED ?? 'true'
  };

  try {
    await runNpmScript(['run', 'demo:reset'], 'demo reset', demoValidationEnv);
    server = await startServer(baseUrl, demoValidationEnv);
    await runNpmScript(['run', 'test:local-full'], 'local full validation', { ...envOverrides, ...demoValidationEnv });
    log('completed successfully');
  } catch (error) {
    primaryError = error;
  } finally {
    if (server) {
      await terminateProcessTree(server).catch((error) => {
        log(`warning: failed to stop dev server cleanly: ${error instanceof Error ? error.message : String(error)}`);
      });
    }

    try {
      await runNpmScript(['run', 'demo:reset'], 'demo reset cleanup', demoValidationEnv);
    } catch (error) {
      if (!primaryError) {
        primaryError = error;
      } else {
        log(`warning: cleanup reset failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  if (primaryError) {
    throw primaryError;
  }
}

main().catch((error) => {
  console.error(error);
  console.error(`server stdout: ${serverStdoutPath}`);
  console.error(`server stderr: ${serverStderrPath}`);
  process.exitCode = 1;
});
