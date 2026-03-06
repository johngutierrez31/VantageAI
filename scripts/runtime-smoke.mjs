import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const port =
  Number.parseInt(process.env.SMOKE_PORT ?? '', 10) ||
  (32000 + Math.floor(Math.random() * 2000));
const host = '127.0.0.1';
const baseUrl = `http://${host}:${port}`;
const nextBinPath = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');

const startupLogs = [];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureProductionBuildExists() {
  const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');
  try {
    await access(buildIdPath);
  } catch {
    throw new Error('Missing production build (.next/BUILD_ID). Run `npm run build` before runtime smoke.');
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function waitForServerReady() {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/login`, { redirect: 'manual' }, 2500);
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch {
      // keep polling
    }
    await delay(500);
  }

  throw new Error(`Server did not become ready at ${baseUrl} within timeout.`);
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function printResult(name, ok, details) {
  const marker = ok ? 'PASS' : 'FAIL';
  console.log(`[${marker}] ${name} - ${details}`);
}

async function runChecks() {
  const failures = [];

  const root = await fetchWithTimeout(`${baseUrl}/`, { redirect: 'manual' });
  const rootBody = await root.text();
  const rootLocation = root.headers.get('location') ?? '';
  const rootOk =
    (root.status === 200 && rootBody.length > 100) ||
    ([302, 303, 307, 308].includes(root.status) &&
      (rootLocation.includes('/app') || rootLocation.includes('/login')));
  printResult(
    'GET /',
    rootOk,
    `status=${root.status} location=${rootLocation || 'none'} bytes=${rootBody.length}`
  );
  if (!rootOk) failures.push('GET /');

  const login = await fetchWithTimeout(`${baseUrl}/login`, { redirect: 'manual' });
  const loginBody = await login.text();
  const loginOk = login.status === 200 && loginBody.length > 100;
  printResult('GET /login', loginOk, `status=${login.status} bytes=${loginBody.length}`);
  if (!loginOk) failures.push('GET /login');

  const skills = await fetchWithTimeout(`${baseUrl}/skills`, { redirect: 'manual' });
  const skillsBody = await skills.text();
  const skillsOk = skills.status === 200 && skillsBody.length > 100;
  printResult('GET /skills', skillsOk, `status=${skills.status} bytes=${skillsBody.length}`);
  if (!skillsOk) failures.push('GET /skills');

  const app = await fetchWithTimeout(`${baseUrl}/app`, { redirect: 'manual' });
  const appLocation = app.headers.get('location') ?? '';
  const appOk = [302, 303, 307, 308].includes(app.status) && appLocation.includes('/login');
  printResult('GET /app auth-gate', appOk, `status=${app.status} location=${appLocation || 'none'}`);
  if (!appOk) failures.push('GET /app auth-gate');

  const commandCenter = await fetchWithTimeout(`${baseUrl}/app/command-center`, { redirect: 'manual' });
  const commandCenterLocation = commandCenter.headers.get('location') ?? '';
  const commandCenterOk =
    [302, 303, 307, 308].includes(commandCenter.status) && commandCenterLocation.includes('/login');
  printResult(
    'GET /app/command-center auth-gate',
    commandCenterOk,
    `status=${commandCenter.status} location=${commandCenterLocation || 'none'}`
  );
  if (!commandCenterOk) failures.push('GET /app/command-center auth-gate');

  const runbooks = await fetchWithTimeout(`${baseUrl}/app/runbooks`, { redirect: 'manual' });
  const runbooksLocation = runbooks.headers.get('location') ?? '';
  const runbooksOk = [302, 303, 307, 308].includes(runbooks.status) && runbooksLocation.includes('/login');
  printResult('GET /app/runbooks auth-gate', runbooksOk, `status=${runbooks.status} location=${runbooksLocation || 'none'}`);
  if (!runbooksOk) failures.push('GET /app/runbooks auth-gate');

  const templates = await fetchWithTimeout(`${baseUrl}/api/templates`, { redirect: 'manual' });
  const templatesText = await templates.text();
  const templatesJson = parseJsonSafe(templatesText);
  const templatesOk =
    templates.status === 401 &&
    templatesJson &&
    typeof templatesJson === 'object' &&
    templatesJson.error === 'Unauthorized';
  printResult('GET /api/templates', Boolean(templatesOk), `status=${templates.status}`);
  if (!templatesOk) failures.push('GET /api/templates');

  const assessments = await fetchWithTimeout(`${baseUrl}/api/assessments`, { redirect: 'manual' });
  const assessmentsText = await assessments.text();
  const assessmentsJson = parseJsonSafe(assessmentsText);
  const assessmentsOk =
    assessments.status === 401 &&
    assessmentsJson &&
    typeof assessmentsJson === 'object' &&
    assessmentsJson.error === 'Unauthorized';
  printResult('GET /api/assessments', Boolean(assessmentsOk), `status=${assessments.status}`);
  if (!assessmentsOk) failures.push('GET /api/assessments');

  const intelTrends = await fetchWithTimeout(`${baseUrl}/api/intel/trends`, { redirect: 'manual' });
  const intelTrendsText = await intelTrends.text();
  const intelTrendsJson = parseJsonSafe(intelTrendsText);
  const intelTrendsOk =
    intelTrends.status === 401 &&
    intelTrendsJson &&
    typeof intelTrendsJson === 'object' &&
    intelTrendsJson.error === 'Unauthorized';
  printResult('GET /api/intel/trends', Boolean(intelTrendsOk), `status=${intelTrends.status}`);
  if (!intelTrendsOk) failures.push('GET /api/intel/trends');

  const intelPulse = await fetchWithTimeout(`${baseUrl}/api/intel/pulse`, { redirect: 'manual' });
  const intelPulseText = await intelPulse.text();
  const intelPulseJson = parseJsonSafe(intelPulseText);
  const intelPulseOk =
    intelPulse.status === 401 &&
    intelPulseJson &&
    typeof intelPulseJson === 'object' &&
    intelPulseJson.error === 'Unauthorized';
  printResult('GET /api/intel/pulse', Boolean(intelPulseOk), `status=${intelPulse.status}`);
  if (!intelPulseOk) failures.push('GET /api/intel/pulse');

  const intelMission = await fetchWithTimeout(`${baseUrl}/api/intel/mission`, { redirect: 'manual' });
  const intelMissionText = await intelMission.text();
  const intelMissionJson = parseJsonSafe(intelMissionText);
  const intelMissionOk =
    intelMission.status === 401 &&
    intelMissionJson &&
    typeof intelMissionJson === 'object' &&
    intelMissionJson.error === 'Unauthorized';
  printResult('GET /api/intel/mission', Boolean(intelMissionOk), `status=${intelMission.status}`);
  if (!intelMissionOk) failures.push('GET /api/intel/mission');

  const intelBrief = await fetchWithTimeout(`${baseUrl}/api/intel/brief?format=markdown`, { redirect: 'manual' });
  const intelBriefText = await intelBrief.text();
  const intelBriefJson = parseJsonSafe(intelBriefText);
  const intelBriefOk =
    intelBrief.status === 401 &&
    intelBriefJson &&
    typeof intelBriefJson === 'object' &&
    intelBriefJson.error === 'Unauthorized';
  printResult('GET /api/intel/brief', Boolean(intelBriefOk), `status=${intelBrief.status}`);
  if (!intelBriefOk) failures.push('GET /api/intel/brief');

  const intelRunbooks = await fetchWithTimeout(`${baseUrl}/api/intel/runbooks`, { redirect: 'manual' });
  const intelRunbooksText = await intelRunbooks.text();
  const intelRunbooksJson = parseJsonSafe(intelRunbooksText);
  const intelRunbooksOk =
    intelRunbooks.status === 401 &&
    intelRunbooksJson &&
    typeof intelRunbooksJson === 'object' &&
    intelRunbooksJson.error === 'Unauthorized';
  printResult('GET /api/intel/runbooks', Boolean(intelRunbooksOk), `status=${intelRunbooks.status}`);
  if (!intelRunbooksOk) failures.push('GET /api/intel/runbooks');

  const webhookGet = await fetchWithTimeout(`${baseUrl}/api/stripe/webhook`, { redirect: 'manual' });
  const webhookOk = webhookGet.status === 405;
  printResult('GET /api/stripe/webhook', webhookOk, `status=${webhookGet.status}`);
  if (!webhookOk) failures.push('GET /api/stripe/webhook');

  if (failures.length > 0) {
    throw new Error(`Runtime smoke checks failed: ${failures.join(', ')}`);
  }
}

function startServer() {
  const child = spawn(process.execPath, [nextBinPath, 'start', '--hostname', host, '--port', String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? baseUrl,
      APP_BASE_URL: process.env.APP_BASE_URL ?? baseUrl,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'runtime-smoke-secret',
      AUTH_SECRET:
        process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'runtime-smoke-secret'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (buffer) => startupLogs.push(buffer.toString()));
  child.stderr.on('data', (buffer) => startupLogs.push(buffer.toString()));

  return child;
}

async function stopServer(child) {
  if (child.exitCode !== null) return;

  child.kill('SIGTERM');
  await delay(500);
  if (child.exitCode === null) {
    child.kill('SIGKILL');
    await delay(300);
  }
}

async function main() {
  await ensureProductionBuildExists();
  console.log(`Starting server for runtime smoke at ${baseUrl}`);

  const child = startServer();

  try {
    await waitForServerReady();
    await runChecks();
    console.log('Runtime smoke checks completed successfully.');
  } finally {
    await stopServer(child);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  if (startupLogs.length) {
    console.error('--- Server logs ---');
    console.error(startupLogs.join('').trim());
  }
  process.exit(1);
});
