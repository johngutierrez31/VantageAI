import { spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
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

function spawnNpm(args: string[], stdio: 'inherit' | ['ignore', 'pipe', 'pipe']) {
  if (process.platform === 'win32') {
    const commandLine = [npmCommand, ...args].map(quoteWindowsArg).join(' ');
    return spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', commandLine], {
      cwd: process.cwd(),
      env: process.env,
      stdio
    });
  }

  return spawn(npmCommand, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio
  });
}

async function ensureOutputDir() {
  await fs.mkdir(outputDir, { recursive: true });
}

async function runNpmScript(args: string[], label: string) {
  log(`running ${label}`);
  await new Promise<void>((resolve, reject) => {
    const child = spawnNpm(args, 'inherit');

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

async function waitForUrl(url: string, timeoutMs: number) {
  const startedAt = Date.now();
  let lastError = 'No response received';

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = `Unexpected status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError}`);
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
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (!child.killed) {
    child.kill('SIGKILL');
  }
}

async function startServer() {
  await ensureOutputDir();
  const stdoutStream = createWriteStream(serverStdoutPath, { flags: 'w' });
  const stderrStream = createWriteStream(serverStderrPath, { flags: 'w' });
  const serverArgs =
    serverScript === 'start'
      ? ['run', 'start', '--', '--hostname', '127.0.0.1', '--port', '3000']
      : ['run', 'dev', '--', '--hostname', '127.0.0.1'];

  log(`starting ${serverScript} server`);
  const child = spawnNpm(serverArgs, ['ignore', 'pipe', 'pipe']);

  child.stdout?.pipe(stdoutStream);
  child.stderr?.pipe(stderrStream);

  child.on('exit', (code) => {
    log(`dev server exited with code ${code ?? 'unknown'}`);
  });

  await waitForUrl(`${baseUrl}/login`, 120_000);
  return child;
}

async function main() {
  let server: ChildProcess | null = null;
  let primaryError: unknown = null;

  try {
    await runNpmScript(['run', 'demo:reset'], 'demo reset');
    server = await startServer();
    await runNpmScript(['run', 'test:local-full'], 'local full validation');
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
      await runNpmScript(['run', 'demo:reset'], 'demo reset cleanup');
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
