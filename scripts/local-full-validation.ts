import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Page } from 'playwright';
import { getPolicyCatalog } from '../src/lib/policy-generator/library';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const VALIDATION_TEMPLATE_NAME = 'Automation Validation Template';
const VALIDATION_ASSESSMENT_NAME = 'Automation Validation Assessment';
const VALIDATION_EVIDENCE_NAME = 'validation-evidence.txt';
const VALIDATION_TRUST_TITLE = 'Validation Trust Packet';
const OUTPUT_ROOT = path.join(process.cwd(), 'output', 'test');
const UI_ROOT = path.join(OUTPUT_ROOT, 'ui');
const API_ROOT = path.join(OUTPUT_ROOT, 'api');
const DOWNLOAD_ROOT = path.join(OUTPUT_ROOT, 'downloads');
const LOG_ROOT = path.join(OUTPUT_ROOT, 'logs');

async function launchValidationBrowser() {
  const preferredChannel = process.env.PLAYWRIGHT_CHANNEL ?? (process.env.CI ? undefined : 'chrome');

  if (preferredChannel) {
    try {
      return await chromium.launch({
        channel: preferredChannel,
        headless: true
      });
    } catch (error) {
      summary.notes.push(
        `Playwright could not launch channel "${preferredChannel}". Falling back to bundled Chromium.`
      );
      if (process.env.CI) {
        summary.notes.push(
          `Channel launch error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  return chromium.launch({
    headless: true
  });
}

type Summary = {
  startedAt: string;
  finishedAt?: string;
  baseUrl: string;
  openAiKeyConfigured: boolean;
  createdEntities: Record<string, string | number | null>;
  uiRoutes: Array<{
    route: string;
    title: string;
    heading: string | null;
    screenshot: string;
    discoveredLinks: string[];
  }>;
  apiChecks: Array<{
    name: string;
    method: string;
    url: string;
    status: number;
    artifact?: string;
  }>;
  downloads: Array<{
    name: string;
    file: string;
    source: string;
  }>;
  notes: string[];
  failures: string[];
};

const summary: Summary = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  openAiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
  createdEntities: {},
  uiRoutes: [],
  apiChecks: [],
  downloads: [],
  notes: [],
  failures: []
};

function safeName(value: string) {
  return value
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

async function ensureCleanOutput() {
  await fs.rm(OUTPUT_ROOT, { recursive: true, force: true });
  await fs.mkdir(UI_ROOT, { recursive: true });
  await fs.mkdir(API_ROOT, { recursive: true });
  await fs.mkdir(DOWNLOAD_ROOT, { recursive: true });
  await fs.mkdir(LOG_ROOT, { recursive: true });
}

async function writeText(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

async function writeJson(filePath: string, data: unknown) {
  await writeText(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function waitForServer() {
  let lastError = 'Server did not respond';
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}/login`);
      if (response.ok) return;
      lastError = `Unexpected status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Local server is unavailable at ${BASE_URL}: ${lastError}`);
}

function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function fileNameFromDisposition(disposition: string | null, fallback: string) {
  const match = disposition?.match(/filename="([^"]+)"/i);
  return match?.[1] ?? fallback;
}

async function requestText(
  name: string,
  urlPath: string,
  options: RequestInit = {},
  artifactBaseName?: string
) {
  const response = await fetch(`${BASE_URL}${urlPath}`, options);
  const text = await response.text();
  const artifact =
    artifactBaseName && text
      ? path.join(API_ROOT, `${artifactBaseName}.${response.ok ? 'txt' : 'error.txt'}`)
      : undefined;

  if (artifact) {
    await writeText(artifact, text);
  }

  summary.apiChecks.push({
    name,
    method: options.method ?? 'GET',
    url: urlPath,
    status: response.status,
    artifact: artifact ? path.relative(OUTPUT_ROOT, artifact) : undefined
  });

  if (!response.ok) {
    throw new Error(`${name} failed with ${response.status}: ${text.slice(0, 400)}`);
  }

  return { response, text, artifact };
}

async function requestJson<T>(
  name: string,
  urlPath: string,
  options: RequestInit = {},
  artifactBaseName?: string
) {
  const response = await fetch(`${BASE_URL}${urlPath}`, options);
  const text = await response.text();
  const payload = parseJson(text);
  const artifact = artifactBaseName ? path.join(API_ROOT, `${artifactBaseName}.json`) : undefined;

  if (artifact) {
    if (payload !== null) {
      await writeJson(artifact, payload);
    } else {
      await writeText(path.join(API_ROOT, `${artifactBaseName}.raw.txt`), text);
    }
  }

  summary.apiChecks.push({
    name,
    method: options.method ?? 'GET',
    url: urlPath,
    status: response.status,
    artifact: artifact ? path.relative(OUTPUT_ROOT, artifact) : undefined
  });

  if (!response.ok) {
    throw new Error(`${name} failed with ${response.status}: ${text.slice(0, 400)}`);
  }

  return { response, payload: payload as T, text, artifact };
}

async function requestBinary(
  name: string,
  urlPath: string,
  targetDir: string,
  fallbackFileName: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${BASE_URL}${urlPath}`, options);
  const buffer = Buffer.from(await response.arrayBuffer());
  const fileName = fileNameFromDisposition(response.headers.get('content-disposition'), fallbackFileName);
  const target = path.join(targetDir, fileName);

  summary.apiChecks.push({
    name,
    method: options.method ?? 'GET',
    url: urlPath,
    status: response.status,
    artifact: path.relative(OUTPUT_ROOT, target)
  });

  if (!response.ok) {
    const text = buffer.toString('utf8');
    throw new Error(`${name} failed with ${response.status}: ${text.slice(0, 400)}`);
  }

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
  summary.downloads.push({
    name,
    file: path.relative(OUTPUT_ROOT, target),
    source: urlPath
  });
  return target;
}

async function waitForAppPage(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('main');
  await page.waitForTimeout(1000);
}

async function captureRoute(page: Page, route: string) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
  await waitForAppPage(page);

  const heading = (await page.locator('main h1').first().textContent().catch(() => null))?.trim() ?? null;
  const title = await page.title();
  const links = await page
    .locator('a[href]')
    .evaluateAll((elements) =>
      elements
        .map((element) => element.getAttribute('href') ?? '')
        .filter((href) => href.startsWith('/'))
        .filter((href, index, all) => all.indexOf(href) === index)
        .sort()
    );

  const screenshot = path.join(UI_ROOT, `${safeName(route || 'root')}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  summary.uiRoutes.push({
    route,
    title,
    heading,
    screenshot: path.relative(OUTPUT_ROOT, screenshot),
    discoveredLinks: links
  });

  return links;
}

async function saveDownloadFromClick(page: Page, label: string, click: () => Promise<void>) {
  const [download] = await Promise.all([page.waitForEvent('download'), click()]);
  const suggested = await download.suggestedFilename();
  const target = path.join(DOWNLOAD_ROOT, suggested);
  await download.saveAs(target);
  summary.downloads.push({
    name: label,
    file: path.relative(OUTPUT_ROOT, target),
    source: 'ui-download'
  });
  return target;
}

async function savePopupPdf(page: Page, label: string, click: () => Promise<void>, baseName: string) {
  const [popup] = await Promise.all([page.waitForEvent('popup'), click()]);
  await popup.waitForLoadState('domcontentloaded');
  await popup.waitForTimeout(500);
  const html = await popup.content();
  const htmlPath = path.join(DOWNLOAD_ROOT, `${baseName}.html`);
  const pdfPath = path.join(DOWNLOAD_ROOT, `${baseName}.pdf`);
  await writeText(htmlPath, html);
  await popup.pdf({ path: pdfPath, format: 'A4', printBackground: true });
  await popup.close();

  summary.downloads.push({
    name: `${label} HTML`,
    file: path.relative(OUTPUT_ROOT, htmlPath),
    source: 'ui-popup'
  });
  summary.downloads.push({
    name: `${label} PDF`,
    file: path.relative(OUTPUT_ROOT, pdfPath),
    source: 'ui-popup'
  });
}

async function runApiValidation() {
  const { payload: templates } = await requestJson<Array<{ id: string; name: string }>>(
    'List templates',
    '/api/templates',
    {},
    'templates'
  );
  const { payload: existingAssessments } = await requestJson<Array<{ id: string; name: string }>>(
    'List existing assessments before validation',
    '/api/assessments',
    {},
    'assessments-before'
  );

  const { payload: templateCatalog } = await requestJson<Array<{ id: string; name: string }>>(
    'List templates again for baseline',
    '/api/templates',
    {},
    'templates-baseline'
  );

  let activeTemplate =
    templates.find((template) => template.name === VALIDATION_TEMPLATE_NAME) ?? templates[0] ?? null;

  try {
    const { payload: createdTemplate } = await requestJson<{ id: string; name: string }>(
      'Create template',
      '/api/templates',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: VALIDATION_TEMPLATE_NAME,
          description: 'Created by the local validation harness.',
          versionTitle: 'Validation v1',
          controls: [
            {
              sectionTitle: 'Identity',
              domain: 'Identity',
              code: 'IAM-1',
              title: 'Administrative access control',
              weight: 1,
              questions: [
                {
                  prompt: 'Is MFA enforced for privileged accounts?',
                  rubric: '0=No, 4=Yes',
                  answerType: 'TEXT',
                  weight: 1
                },
                {
                  prompt: 'Are admin access reviews performed quarterly?',
                  rubric: '0=No, 4=Yes',
                  answerType: 'TEXT',
                  weight: 1
                }
              ]
            },
            {
              sectionTitle: 'Logging',
              domain: 'Monitoring',
              code: 'MON-1',
              title: 'Security telemetry retention',
              weight: 1,
              questions: [
                {
                  prompt: 'Are authentication logs retained for at least 90 days?',
                  rubric: '0=No, 4=Yes',
                  answerType: 'TEXT',
                  weight: 1
                }
              ]
            }
          ]
        })
      },
      'template-created'
    );
    activeTemplate = createdTemplate;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if ((message.includes('402') || message.includes('409')) && activeTemplate) {
      summary.notes.push(
        `Template creation was skipped because the validation template already exists or the plan limit was reached. Reused template ${activeTemplate.id}.`
      );
    } else {
      throw error;
    }
  }

  if (!activeTemplate) {
    throw new Error('No template is available for validation.');
  }

  summary.createdEntities.templateId = activeTemplate.id;
  await requestJson('Template detail', `/api/templates/${activeTemplate.id}`, {}, 'template-detail');

  let assessment =
    existingAssessments.find((item) => item.name === VALIDATION_ASSESSMENT_NAME) ?? null;
  try {
    const createdAssessment = await requestJson<{ id: string; name: string }>(
      'Create assessment',
      '/api/assessments',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: activeTemplate.id,
          name: VALIDATION_ASSESSMENT_NAME,
          customerName: 'Validation Tenant'
        })
      },
      'assessment-created'
    );
    assessment = createdAssessment.payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if ((message.includes('402') || message.includes('409')) && assessment) {
      summary.notes.push(
        `Assessment creation was skipped because the validation assessment already exists or the plan limit was reached. Reused assessment ${assessment.id}.`
      );
    } else {
      throw error;
    }
  }

  if (!assessment) {
    throw new Error('No assessment is available for validation.');
  }

  summary.createdEntities.assessmentId = assessment.id;

  const { payload: assessmentDetail } = await requestJson<{
    assessment: { id: string; name: string };
    questions: Array<{ id: string; prompt: string }>;
  }>('Assessment detail', `/api/assessments/${assessment.id}`, {}, 'assessment-detail');

  const patchedResponses = assessmentDetail.questions.slice(0, 3).map((question, index) => ({
    questionId: question.id,
    answer: index === 0 ? 'MFA is enforced across privileged accounts.' : 'Validation harness answer.',
    score: 4 - index,
    confidence: 0.85,
    rationale: `Automated validation response for ${question.prompt}`
  }));

  await requestJson(
    'Patch assessment responses',
    `/api/assessments/${assessment.id}/responses`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses: patchedResponses })
    },
    'assessment-responses'
  );

  await requestJson('Assessment score', `/api/assessments/${assessment.id}/score`, {}, 'assessment-score');

  const { payload: report } = await requestJson<{ id: string; title: string }>(
    'Generate assessment report',
    `/api/assessments/${assessment.id}/report`,
    { method: 'POST' },
    'report-generated'
  );
  summary.createdEntities.reportId = report.id;

  await requestJson('Fetch assessment report', `/api/assessments/${assessment.id}/report`, {}, 'report-detail');
  await requestBinary(
    'Export report HTML',
    `/api/reports/${report.id}/export?format=html&view=detailed`,
    DOWNLOAD_ROOT,
    'assessment-report.html'
  );
  await requestBinary(
    'Export report Markdown',
    `/api/reports/${report.id}/export?format=markdown&view=detailed`,
    DOWNLOAD_ROOT,
    'assessment-report.md'
  );
  await requestBinary(
    'Export report JSON',
    `/api/reports/${report.id}/export?format=json&view=detailed`,
    DOWNLOAD_ROOT,
    'assessment-report.json'
  );
  await requestBinary(
    'Export report PDF',
    `/api/reports/${report.id}/export?format=pdf&view=detailed`,
    DOWNLOAD_ROOT,
    'assessment-report.pdf'
  );

  const { payload: evidence } = await requestJson<{ id: string; name: string }>(
    'Create evidence',
    '/api/evidence',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: VALIDATION_EVIDENCE_NAME,
        mimeType: 'text/plain',
        tags: ['validation', 'controls'],
        content: [
          'Privileged access requires MFA.',
          'Authentication logs are retained for 180 days.',
          'Critical vulnerabilities are patched within 7 days.',
          'Quarterly access reviews are documented and approved by security leadership.'
        ].join('\n')
      })
    },
    'evidence-created'
  );
  summary.createdEntities.evidenceId = evidence.id;
  await requestJson('List evidence', '/api/evidence', {}, 'evidence-list');

  const questionnaireContent = [
    'question,answer,score,confidence',
    '"Do you enforce MFA for admins?","Yes, enforced through SSO",4,0.9',
    '"How long are security logs retained?","180 days in central SIEM",4,0.8',
    '"How quickly are critical patches applied?","Within 7 days",3,0.75'
  ].join('\n');

  const { payload: questionnaire } = await requestJson<{ id: string; filename: string }>(
    'Upload questionnaire',
    '/api/questionnaires/upload',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'validation-questionnaire.csv',
        format: 'csv',
        content: questionnaireContent
      })
    },
    'questionnaire-uploaded'
  );
  summary.createdEntities.questionnaireId = questionnaire.id;

  await requestJson(
    'Map questionnaire',
    `/api/questionnaires/${questionnaire.id}/map`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId: assessment.id })
    },
    'questionnaire-mapped'
  );

  await requestJson(
    'Draft questionnaire answers',
    `/api/questionnaires/${questionnaire.id}/draft`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxItems: 3 })
    },
    'questionnaire-drafted'
  );

  await requestBinary(
    'Export questionnaire CSV',
    `/api/questionnaires/${questionnaire.id}/export`,
    DOWNLOAD_ROOT,
    'questionnaire-export.csv',
    { method: 'POST' }
  );

  const { payload: trustItem } = await requestJson<{ id: string; title: string }>(
    'Create trust inbox item',
    '/api/trust/inbox',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: VALIDATION_TRUST_TITLE,
        requesterEmail: 'customer@example.com',
        questionnaireUploadId: questionnaire.id,
        notes: 'Created during local validation.'
      })
    },
    'trust-item-created'
  );
  summary.createdEntities.trustInboxItemId = trustItem.id;

  await requestBinary(
    'Export trust inbox CSV',
    `/api/trust/inbox/${trustItem.id}/export`,
    DOWNLOAD_ROOT,
    'trust-inbox-export.csv',
    { method: 'POST' }
  );

  await requestJson('List questionnaires', '/api/questionnaires', {}, 'questionnaire-list');
  await requestJson('List trust inbox items', '/api/trust/inbox', {}, 'trust-inbox-list');

  const { payload: missionQueue } = await requestJson<{
    missionQueue: Array<{ id: string }>;
  }>('Get mission queue', '/api/intel/mission', {}, 'intel-mission');

  const selectedMissionIds = missionQueue.missionQueue.slice(0, 2).map((mission) => mission.id);
  await requestJson(
    'Seed mission tasks',
    '/api/intel/mission',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        missionIds: selectedMissionIds,
        assignee: 'Automation Bot'
      })
    },
    'intel-mission-seeded'
  );

  const { payload: runbookList } = await requestJson<{
    runbooks: Array<{ id: string }>;
  }>('Get runbooks', '/api/intel/runbooks', {}, 'intel-runbooks');

  if (runbookList.runbooks.length > 0) {
    await requestJson(
      'Seed runbook tasks',
      '/api/intel/runbooks',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runbookId: runbookList.runbooks[0].id,
          assignee: 'Automation Bot'
        })
      },
      'intel-runbook-seeded'
    );
  }

  await requestJson('List tasks', '/api/tasks', {}, 'tasks');
  await requestJson('Threat trends', '/api/intel/trends', {}, 'intel-trends');
  await requestJson('Security pulse', '/api/intel/pulse', {}, 'intel-pulse');
  await requestText('Weekly brief markdown', '/api/intel/brief?format=markdown&download=true', {}, 'intel-brief-markdown');
  await requestText('Weekly brief HTML', '/api/intel/brief?format=html&download=true', {}, 'intel-brief-html');
  await requestJson('Weekly brief JSON', '/api/intel/brief?format=json', {}, 'intel-brief-json');

  const { payload: cyberRangePlan } = await requestJson<{ plan: { planId: string } }>(
    'Generate cyber range plan',
    '/api/cyber-range/generate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rangeName: 'Validation Range',
        organizationName: 'VantageAI',
        primaryUseCase: 'Validate end-to-end cyber range generation and export flows for the solo operator console.',
        environment: 'hybrid',
        scale: 'medium',
        fidelity: 'high',
        durationDays: 3,
        participants: 24,
        includeIdentityZone: true,
        includeOtZone: false,
        includeNpcTraffic: true,
        complianceTags: ['SOC 2', 'ISO 27001']
      })
    },
    'cyber-range-plan'
  );
  summary.createdEntities.cyberRangePlanId = cyberRangePlan.plan.planId;

  const policyCatalog = await getPolicyCatalog();
  const policyIds = policyCatalog.policies.slice(0, 3).map((policy) => policy.id);
  const { payload: policyGeneration } = await requestJson<{
    generatedAt: string;
    documents: Array<{ fileName: string; content: string }>;
  }>(
    'Generate policy documents',
    '/api/policies/generate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        policyIds,
        formats: ['markdown', 'html', 'json'],
        organization: {
          companyName: 'Validation Security LLC',
          industry: 'Technology',
          organizationSize: '50-200',
          responsibleOfficer: 'Security Lead',
          responsibleDepartment: 'Security',
          contactEmail: 'security@validation.local',
          effectiveDate: new Date().toISOString().slice(0, 10),
          reviewSchedule: 'Annually',
          version: '1.0',
          frameworks: ['ISO 27001', 'SOC 2'],
          regulations: ['None']
        },
        notes: 'Generated by the local validation harness.'
      })
    },
    'policy-generation'
  );

  for (const document of policyGeneration.documents) {
    const filePath = path.join(DOWNLOAD_ROOT, document.fileName);
    await writeText(filePath, document.content);
    summary.downloads.push({
      name: `Policy document ${document.fileName}`,
      file: path.relative(OUTPUT_ROOT, filePath),
      source: '/api/policies/generate'
    });
  }

  const { payload: copilot } = await requestJson<{
    answer: string;
    model: string;
    citations: Array<{ evidenceName: string }>;
  }>(
    'Copilot request',
    '/api/copilot',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'compliance',
        message: 'Map immediate SOC 2 priorities for access control, logging, and incident response.',
        history: []
      })
    },
    'copilot-response'
  );
  summary.createdEntities.copilotModel = copilot.model;
  if (!summary.openAiKeyConfigured) {
    summary.notes.push(
      `OPENAI_API_KEY is not configured locally. Copilot responded in fallback mode (${copilot.model}).`
    );
  } else {
    if (copilot.model === 'heuristic-fallback') {
      throw new Error('Copilot remained in heuristic fallback mode despite OPENAI_API_KEY being configured.');
    }
    summary.notes.push(`OPENAI_API_KEY is configured. Copilot responded with live model ${copilot.model}.`);
  }

  await requestJson('List assessments', '/api/assessments', {}, 'assessments');

  summary.notes.push(
    `Template catalog contained ${templateCatalog.length} visible template records before this run.`
  );
}

async function runUiValidation() {
  const browser = await launchValidationBrowser();

  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1440, height: 1400 }
  });

  const page = await context.newPage();
  try {
    const routes = new Set<string>([
      '/app/command-center',
      '/app/tools',
      '/app/copilot',
      '/app/security-analyst',
      '/app/cyber-range',
      '/app/runbooks',
      '/app/policies',
      '/app/evidence',
      '/app/assessments',
      '/app/questionnaires',
      '/app/trust',
      '/app/trust/inbox',
      '/app/findings',
      '/app/overview',
      '/app/reports',
      '/app/templates',
      '/app/settings',
      '/app/settings/billing',
      '/app/settings/members'
    ]);

    if (summary.createdEntities.assessmentId) {
      routes.add(`/app/assessments/${summary.createdEntities.assessmentId}`);
    }
    if (summary.createdEntities.questionnaireId) {
      routes.add(`/app/questionnaires/${summary.createdEntities.questionnaireId}`);
    }
    if (summary.createdEntities.trustInboxItemId) {
      routes.add(`/app/trust/inbox/${summary.createdEntities.trustInboxItemId}`);
    }
    if (summary.createdEntities.templateId) {
      routes.add(`/app/templates/${summary.createdEntities.templateId}`);
    }

    const discovered = new Set<string>();
    for (const route of routes) {
      const links = await captureRoute(page, route);
      for (const link of links) {
        if (link.startsWith('/app/')) discovered.add(link);
      }
    }

    for (const link of discovered) {
      if (!routes.has(link)) {
        await captureRoute(page, link);
      }
    }

    await page.goto(`${BASE_URL}/app/command-center`, { waitUntil: 'domcontentloaded' });
    await waitForAppPage(page);
    await saveDownloadFromClick(page, 'Weekly brief markdown', async () => {
      await page.getByRole('button', { name: 'Download Markdown' }).click();
    });
    await saveDownloadFromClick(page, 'Weekly brief HTML', async () => {
      await page.getByRole('button', { name: 'Download HTML' }).click();
    });
    await page.getByPlaceholder('Optional assignee for all created tasks').fill('Automation Bot');
    await page.getByRole('button', { name: 'Create mission task pack' }).click();
    await page.getByText(/Created .* mission tasks/i).waitFor({ timeout: 20000 });
    await page.screenshot({ path: path.join(UI_ROOT, 'command-center-actions.png'), fullPage: true });

    await page.goto(`${BASE_URL}/app/runbooks`, { waitUntil: 'domcontentloaded' });
    await waitForAppPage(page);
    await page.getByPlaceholder('Optional assignee applied to created tasks').fill('Automation Bot');
    await page.getByRole('button', { name: 'Create task pack' }).first().click();
    await page.getByText(/Created \d+ tasks from runbook/i).waitFor({ timeout: 20000 });
    await page.screenshot({ path: path.join(UI_ROOT, 'runbooks-actions.png'), fullPage: true });

    await page.goto(`${BASE_URL}/app/copilot`, { waitUntil: 'domcontentloaded' });
    await waitForAppPage(page);
    await page
      .getByPlaceholder('Ask for practical next steps, evidence checklists, or roadmap plans...')
      .fill('Map immediate SOC 2 priorities for access control, logging, and incident response.');
    await page.getByRole('button', { name: 'Ask Copilot' }).click();
    await page.waitForSelector('text=Thinking...', { timeout: 10000 });
    await page.waitForSelector('text=Thinking...', { state: 'detached', timeout: 30000 });
    const copilotTranscript = await page.locator('div.rounded-md.border.p-3').allTextContents();
    await writeText(path.join(LOG_ROOT, 'copilot-ui.txt'), `${copilotTranscript.join('\n\n')}\n`);
    await page.screenshot({ path: path.join(UI_ROOT, 'copilot-response.png'), fullPage: true });

    await page.goto(`${BASE_URL}/app/security-analyst`, { waitUntil: 'domcontentloaded' });
    await waitForAppPage(page);
    await page.getByRole('button', { name: 'Run Security Analysis' }).click();
    await page.getByText('Security analysis generated.').waitFor({ timeout: 30000 });
    await saveDownloadFromClick(page, 'Security analyst markdown', async () => {
      await page.getByRole('button', { name: 'Download Markdown' }).click();
    });
    await savePopupPdf(
      page,
      'Security analyst report',
      async () => {
        await page.getByRole('button', { name: 'Export PDF (Print)' }).click();
      },
      'security-analyst-report'
    );
    await page.screenshot({ path: path.join(UI_ROOT, 'security-analyst-response.png'), fullPage: true });

    await page.goto(`${BASE_URL}/app/cyber-range`, { waitUntil: 'domcontentloaded' });
    await waitForAppPage(page);
    await page.getByRole('button', { name: 'Generate Cyber Range Plan' }).click();
    await page.getByText('Cyber range plan generated.').waitFor({ timeout: 20000 });
    await saveDownloadFromClick(page, 'Cyber range markdown', async () => {
      await page.getByRole('button', { name: 'Download Markdown' }).click();
    });
    await saveDownloadFromClick(page, 'Cyber range JSON', async () => {
      await page.getByRole('button', { name: 'Download JSON' }).click();
    });
    await saveDownloadFromClick(page, 'Cyber range HTML', async () => {
      await page.getByRole('button', { name: 'Download HTML' }).click();
    });
    await savePopupPdf(
      page,
      'Cyber range plan',
      async () => {
        await page.getByRole('button', { name: 'Save PDF' }).click();
      },
      'cyber-range-plan'
    );
    await page.screenshot({ path: path.join(UI_ROOT, 'cyber-range-response.png'), fullPage: true });

    await page.goto(`${BASE_URL}/app/policies`, { waitUntil: 'domcontentloaded' });
    await waitForAppPage(page);
    await page.getByPlaceholder('Company name').fill('Validation Security LLC');
    await page.getByPlaceholder('security@company.com').fill('security@validation.local');
    await page.getByRole('button', { name: '5 Foundational' }).click();
    await page.getByLabel('JSON (.json)').check();
    await page.getByLabel('PDF (.pdf via Print dialog)').check();
    await page.getByRole('button', { name: 'Generate Policy Documents' }).click();
    await page.getByText(/Generated \d+ document/i).waitFor({ timeout: 30000 });
    await saveDownloadFromClick(page, 'Policy markdown', async () => {
      await page.getByRole('button', { name: 'Download MARKDOWN' }).first().click();
    });
    await saveDownloadFromClick(page, 'Policy HTML', async () => {
      await page.getByRole('button', { name: 'Download HTML' }).first().click();
    });
    await saveDownloadFromClick(page, 'Policy JSON', async () => {
      await page.getByRole('button', { name: 'Download JSON' }).first().click();
    });
    await savePopupPdf(
      page,
      'Policy document',
      async () => {
        await page.getByRole('button', { name: 'Save PDF' }).first().click();
      },
      'policy-document'
    );
    await page.screenshot({ path: path.join(UI_ROOT, 'policies-generated.png'), fullPage: true });
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

async function writeSummary() {
  summary.finishedAt = new Date().toISOString();
  await writeJson(path.join(OUTPUT_ROOT, 'summary.json'), summary);

  const lines = [
    '# Local Validation Summary',
    '',
    `Started: ${summary.startedAt}`,
    `Finished: ${summary.finishedAt}`,
    `Base URL: ${summary.baseUrl}`,
    `OPENAI_API_KEY configured: ${summary.openAiKeyConfigured ? 'yes' : 'no'}`,
    '',
    '## Created Entities',
    ...Object.entries(summary.createdEntities).map(([key, value]) => `- ${key}: ${value ?? 'n/a'}`),
    '',
    '## UI Routes',
    ...summary.uiRoutes.map(
      (route) =>
        `- ${route.route} | heading: ${route.heading ?? 'n/a'} | screenshot: ${route.screenshot} | links: ${route.discoveredLinks.length}`
    ),
    '',
    '## API Checks',
    ...summary.apiChecks.map(
      (check) =>
        `- [${check.status}] ${check.method} ${check.url} (${check.name})${check.artifact ? ` -> ${check.artifact}` : ''}`
    ),
    '',
    '## Downloads',
    ...summary.downloads.map((download) => `- ${download.name}: ${download.file}`),
    '',
    '## Notes',
    ...(summary.notes.length ? summary.notes.map((note) => `- ${note}`) : ['- None']),
    '',
    '## Failures',
    ...(summary.failures.length ? summary.failures.map((failure) => `- ${failure}`) : ['- None'])
  ];

  await writeText(path.join(OUTPUT_ROOT, 'summary.md'), `${lines.join('\n')}\n`);
}

async function main() {
  try {
    await ensureCleanOutput();
    await waitForServer();
    await runApiValidation();
    await runUiValidation();
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    summary.failures.push(message);
  } finally {
    await writeSummary();
  }

  if (summary.failures.length > 0) {
    process.exitCode = 1;
  }
}

await main();
