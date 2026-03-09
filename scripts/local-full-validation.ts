import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Page } from 'playwright';
import { getPolicyCatalog } from '../src/lib/policy-generator/library';
import { prisma } from '../src/lib/db/prisma';

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

async function resolveTenantReviewerUserId(questionnaireUploadId: string) {
  const upload = await prisma.questionnaireUpload.findUnique({
    where: { id: questionnaireUploadId },
    select: { tenantId: true }
  });

  if (!upload) {
    throw new Error(`Unable to resolve questionnaire upload ${questionnaireUploadId} for reviewer lookup.`);
  }

  const membership = await prisma.membership.findFirst({
    where: {
      tenantId: upload.tenantId,
      status: 'ACTIVE'
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    select: { userId: true }
  });

  if (!membership) {
    throw new Error(`No active reviewer membership found for tenant ${upload.tenantId}.`);
  }

  return membership.userId;
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

async function requestJsonWithExpectedStatus<T>(
  name: string,
  urlPath: string,
  expectedStatus: number,
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

  if (response.status !== expectedStatus) {
    throw new Error(`${name} expected ${expectedStatus} but received ${response.status}: ${text.slice(0, 400)}`);
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
    '"How quickly are critical patches applied?","Within 7 days",3,0.75',
    '"Do you guarantee customer-specific data residency commitments?","Pending review",1,0.3'
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

  const reviewerUserId = await resolveTenantReviewerUserId(questionnaire.id);
  summary.createdEntities.reviewerUserId = reviewerUserId;

  await requestJson(
    'Assign questionnaire review owner',
    `/api/questionnaires/${questionnaire.id}/assignment`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignedReviewerUserId: reviewerUserId,
        reviewDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    },
    'questionnaire-assignment'
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

  const { payload: draftedQuestionnaire } = await requestJson<{
    questionnaireId: string;
    drafts: Array<{ itemId: string; rowKey: string; questionText: string; status: string; reviewRequired: boolean }>;
  }>(
    'Draft questionnaire answers',
    `/api/questionnaires/${questionnaire.id}/draft`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxItems: 4 })
    },
    'questionnaire-drafted'
  );

  for (const draft of draftedQuestionnaire.drafts) {
    const shouldReject = /data residency/i.test(draft.questionText) || draft.rowKey === 'row-4';

    if (shouldReject) {
      await requestJson(
        `Reject questionnaire draft ${draft.rowKey}`,
        `/api/questionnaires/${questionnaire.id}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: draft.itemId,
            decision: 'REJECTED',
            reviewerNotes: `Rejected by local validation for ${draft.rowKey} due to unsupported buyer commitment.`,
            saveToLibrary: false
          })
        },
        `questionnaire-review-${draft.rowKey}-rejected`
      );
      continue;
    }

    await requestJson(
      `Approve questionnaire draft ${draft.rowKey}`,
      `/api/questionnaires/${questionnaire.id}/review`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: draft.itemId,
          decision: 'APPROVED',
          reviewerNotes: `Approved by local validation for ${draft.rowKey}.`,
          saveToLibrary: true,
          libraryScope: 'TENANT_SPECIFIC'
        })
      },
      `questionnaire-review-${draft.rowKey}`
    );
  }

  const { payload: evidenceMap } = await requestJson<{
    id: string;
    status: string;
    items: Array<{ id: string }>;
  }>(
    'Generate evidence map',
    `/api/questionnaires/${questionnaire.id}/evidence-map`,
    {
      method: 'POST'
    },
    'questionnaire-evidence-map'
  );
  summary.createdEntities.evidenceMapId = evidenceMap.id;

  await requestJson(
    'Approve evidence map',
    `/api/evidence-maps/${evidenceMap.id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignedReviewerUserId: reviewerUserId,
        reviewDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        reviewerNotes: 'Validated during automated TrustOps Sprint 2 flow.',
        status: 'APPROVED'
      })
    },
    'questionnaire-evidence-map-approved'
  );

  const { payload: answerLibrary } = await requestJson<
    Array<{ id: string; questionText: string; status: string; usageCount: number }>
  >('List answer library', '/api/answer-library', {}, 'answer-library');
  summary.createdEntities.answerLibraryCount = answerLibrary.length;

  if (answerLibrary[0]) {
    await requestJson(
      'Update answer library entry',
      `/api/answer-library/${answerLibrary[0].id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ACTIVE',
          scope: 'REUSABLE',
          ownerUserId: reviewerUserId
        })
      },
      'answer-library-updated'
    );
  }

  const { payload: findings } = await requestJson<
    Array<{ id: string; title: string; status: string; priority: string }>
  >('List findings', '/api/findings', {}, 'findings');
  summary.createdEntities.findingCount = findings.length;

  if (findings[0]) {
    summary.createdEntities.findingId = findings[0].id;
    await requestJson(
      'Update finding',
      `/api/findings/${findings[0].id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          ownerUserId: reviewerUserId
        })
      },
      'finding-updated'
    );
  }

  await requestBinary(
    'Export questionnaire CSV',
    `/api/questionnaires/${questionnaire.id}/export`,
    DOWNLOAD_ROOT,
    'questionnaire-export.csv',
    { method: 'POST' }
  );

  await requestBinary(
    'Export trust inbox CSV',
    `/api/trust/inbox/${trustItem.id}/export`,
    DOWNLOAD_ROOT,
    'trust-inbox-export.csv',
    { method: 'POST' }
  );

  const { payload: trustPacket } = await requestJson<{ id: string; name: string }>(
    'Assemble internal trust packet',
    '/api/trust/packets',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Validation Buyer Packet',
        trustInboxItemId: trustItem.id,
        shareMode: 'INTERNAL_REVIEW',
        approvedContactName: 'Validation Security Lead',
        approvedContactEmail: 'security@validation.local'
      })
    },
    'trust-packet-created'
  );
  summary.createdEntities.trustPacketId = trustPacket.id;

  await requestBinary(
    'Export trust packet HTML',
    `/api/trust/packets/${trustPacket.id}/export?format=html`,
    DOWNLOAD_ROOT,
    'trust-packet.html'
  );
  await requestBinary(
    'Export trust packet Markdown',
    `/api/trust/packets/${trustPacket.id}/export?format=markdown`,
    DOWNLOAD_ROOT,
    'trust-packet.md'
  );
  await requestBinary(
    'Export trust packet JSON',
    `/api/trust/packets/${trustPacket.id}/export?format=json`,
    DOWNLOAD_ROOT,
    'trust-packet.json'
  );

  const { payload: externalTrustPacket } = await requestJson<{ id: string; name: string }>(
    'Assemble external trust packet',
    '/api/trust/packets',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Validation External Buyer Packet',
        trustInboxItemId: trustItem.id,
        shareMode: 'EXTERNAL_SHARE',
        approvedContactName: 'Validation Security Lead',
        approvedContactEmail: 'security@validation.local'
      })
    },
    'trust-packet-external-created'
  );
  summary.createdEntities.externalTrustPacketId = externalTrustPacket.id;

  await requestJson(
    'Mark external trust packet ready',
    `/api/trust/packets/${externalTrustPacket.id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignedReviewerUserId: reviewerUserId,
        reviewDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        reviewerNotes: 'Approved for buyer sharing during automated validation.',
        status: 'READY_TO_SHARE'
      })
    },
    'trust-packet-external-ready'
  );

  await requestBinary(
    'Export external trust packet HTML',
    `/api/trust/packets/${externalTrustPacket.id}/export?format=html`,
    DOWNLOAD_ROOT,
    'trust-packet-external.html'
  );

  const { payload: incidentDetail } = await requestJson<{
    incident: {
      id: string;
      title: string;
      status: string;
      runbookPacks: Array<{ id: string }>;
      linkedFindingIds: string[];
      linkedRiskIds: string[];
    };
    risks: Array<{ id: string }>;
  }>(
    'Create response ops incident',
    '/api/response-ops/incidents',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentType: 'THIRD_PARTY_BREACH',
        severity: 'HIGH',
        title: 'Validation vendor breach incident',
        description:
          'Validation harness incident for a third-party breach affecting a buyer diligence workflow and requiring first-hour triage.',
        detectionSource: 'Validation harness',
        reportedBy: 'Automation Bot',
        incidentOwnerUserId: reviewerUserId,
        communicationsOwnerUserId: reviewerUserId,
        affectedSystems: ['Trust portal', 'Shared vendor SSO'],
        affectedServices: ['Questionnaire response workflow'],
        affectedVendorNames: ['Validation Vendor'],
        questionnaireUploadId: questionnaire.id,
        trustInboxItemId: trustItem.id,
        guidedStart: true,
        launchRunbookPack: true
      })
    },
    'response-ops-incident-created'
  );
  summary.createdEntities.incidentId = incidentDetail.incident.id;
  summary.createdEntities.incidentRunbookPackCount = incidentDetail.incident.runbookPacks.length;

  await requestJson(
    'List response ops incidents in triage',
    '/api/response-ops/incidents?status=TRIAGE',
    {},
    'response-ops-incidents'
  );
  await requestJson(
    'Response ops incident detail',
    `/api/response-ops/incidents/${incidentDetail.incident.id}`,
    {},
    'response-ops-incident-detail'
  );
  await requestJson(
    'Update response ops incident',
    `/api/response-ops/incidents/${incidentDetail.incident.id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ACTIVE',
        executiveSummary:
          'Validation incident is active while vendor impact, trust-facing communications, and compensating controls are coordinated.',
        nextUpdateDueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      })
    },
    'response-ops-incident-updated'
  );
  await requestJson(
    'Add response ops timeline event',
    `/api/response-ops/incidents/${incidentDetail.incident.id}/timeline`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'COMMUNICATION_SENT',
        title: 'Initial leadership update sent',
        detail: 'Leadership was updated on vendor blast radius, containment progress, and next trust-facing checkpoint.',
        isShareable: true
      })
    },
    'response-ops-timeline-event'
  );
  await requestJson(
    'Launch additional response ops runbook pack',
    `/api/response-ops/incidents/${incidentDetail.incident.id}/runbook-packs`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runbookId: 'third-party-breach',
        assignee: reviewerUserId
      })
    },
    'response-ops-runbook-pack-created'
  );

  const { payload: afterActionReport } = await requestJson<{
    id: string;
    status: string;
  }>(
    'Generate response ops after-action report',
    `/api/response-ops/incidents/${incidentDetail.incident.id}/after-action`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    },
    'response-ops-after-action-created'
  );
  summary.createdEntities.afterActionReportId = afterActionReport.id;

  await requestJson(
    'Response ops after-action detail',
    `/api/response-ops/after-action/${afterActionReport.id}`,
    {},
    'response-ops-after-action-detail'
  );
  await requestJsonWithExpectedStatus<{ error: string }>(
    'Block response ops after-action export before approval',
    `/api/response-ops/after-action/${afterActionReport.id}/export?format=html`,
    409,
    {},
    'response-ops-after-action-export-blocked'
  );
  await requestJson(
    'Mark response ops after-action needs review',
    `/api/response-ops/after-action/${afterActionReport.id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'NEEDS_REVIEW',
        reviewerNotes: 'Validation harness staged the report for formal review.'
      })
    },
    'response-ops-after-action-review'
  );
  await requestJson(
    'Approve response ops after-action report',
    `/api/response-ops/after-action/${afterActionReport.id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'APPROVED',
        reviewerNotes: 'Approved for executive closeout and quarterly review reference.'
      })
    },
    'response-ops-after-action-approved'
  );
  await requestBinary(
    'Export response ops after-action HTML',
    `/api/response-ops/after-action/${afterActionReport.id}/export?format=html`,
    DOWNLOAD_ROOT,
    'after-action-report.html'
  );
  await requestBinary(
    'Export response ops after-action Markdown',
    `/api/response-ops/after-action/${afterActionReport.id}/export?format=markdown`,
    DOWNLOAD_ROOT,
    'after-action-report.md'
  );
  await requestBinary(
    'Export response ops after-action JSON',
    `/api/response-ops/after-action/${afterActionReport.id}/export?format=json`,
    DOWNLOAD_ROOT,
    'after-action-report.json'
  );

  const { payload: tabletop } = await requestJson<{
    id: string;
    title: string;
    status: string;
  }>(
    'Create response ops tabletop',
    '/api/response-ops/tabletops',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarioType: 'AI_MISUSE',
        title: 'Validation AI misuse tabletop',
        participantNames: ['Security Lead', 'Engineering Lead', 'Support Lead'],
        participantRoles: ['Incident Commander', 'Engineering', 'Communications']
      })
    },
    'response-ops-tabletop-created'
  );
  summary.createdEntities.tabletopId = tabletop.id;

  await requestJson(
    'List response ops tabletops',
    '/api/response-ops/tabletops?status=DRAFT',
    {},
    'response-ops-tabletops'
  );
  await requestJson(
    'Complete response ops tabletop',
    `/api/response-ops/tabletops/${tabletop.id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'COMPLETED',
        exerciseDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        participantNames: ['Security Lead', 'Engineering Lead', 'Support Lead'],
        participantRoles: ['Incident Commander', 'Engineering', 'Communications'],
        exerciseNotes: 'Validation tabletop completed with AI governance and incident-response coordination checks.',
        decisionsMade: [
          'Disable the unsafe AI workflow immediately when customer data handling is unclear.',
          'Escalate to AI governance before re-enabling vendor-hosted automation.'
        ],
        gapsIdentified: [
          'AI workflow shutdown authority was not documented clearly.',
          'Customer communications around unsafe AI output need a standard decision path.'
        ],
        followUpActions: [
          'Document AI workflow shutdown authority for on-call operators.',
          'Add a customer communication checkpoint for AI misuse incidents.'
        ],
        reviewerNotes: 'Completed during automated validation.'
      })
    },
    'response-ops-tabletop-completed'
  );
  await requestJson(
    'Response ops tabletop detail',
    `/api/response-ops/tabletops/${tabletop.id}`,
    {},
    'response-ops-tabletop-detail'
  );
  await requestJson(
    'List findings after Response Ops sync',
    '/api/findings',
    {},
    'findings-after-response-ops'
  );

  const { payload: pulseSnapshot } = await requestJson<{
    id: string;
    reportingPeriod: string;
    status: string;
    overallScore: number;
  }>(
    'Generate pulse snapshot',
    '/api/pulse/snapshots',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        periodType: 'QUARTERLY'
      })
    },
    'pulse-snapshot-created'
  );
  summary.createdEntities.pulseSnapshotId = pulseSnapshot.id;

  await requestJson(
    'Pulse snapshot detail',
    `/api/pulse/snapshots/${pulseSnapshot.id}`,
    {},
    'pulse-snapshot-detail'
  );

  await requestJson(
    'Approve pulse snapshot',
    `/api/pulse/snapshots/${pulseSnapshot.id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'APPROVED'
      })
    },
    'pulse-snapshot-approved'
  );

  const { payload: syncedRisks } = await requestJson<
    Array<{ id: string; title: string; severity: string; status: string }>
  >(
    'Sync pulse risk register',
    '/api/pulse/risks',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'sync' })
    },
    'pulse-risks-synced'
  );
  summary.createdEntities.pulseRiskCount = syncedRisks.length;

  const { payload: manualRisk } = await requestJson<{
    id: string;
    title: string;
    severity: string;
    status: string;
  }>(
    'Create manual pulse risk',
    '/api/pulse/risks',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Vendor access review cadence is not formally tracked',
        description: 'Critical vendor access reviews are being handled informally, which can delay leadership visibility and remediation ownership.',
        businessImpactSummary: 'Weak vendor access review discipline can increase exposure and create buyer concern during diligence.',
        severity: 'HIGH',
        likelihood: 'MEDIUM',
        impact: 'HIGH',
        status: 'OPEN',
        ownerUserId: reviewerUserId,
        targetDueAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        linkedFindingIds: findings[0] ? [findings[0].id] : [],
        linkedQuestionnaireIds: [questionnaire.id],
        linkedEvidenceMapIds: [evidenceMap.id],
        linkedTrustPacketIds: [trustPacket.id]
      })
    },
    'pulse-risk-manual'
  );
  summary.createdEntities.manualRiskId = manualRisk.id;

  const primaryRiskId = syncedRisks[0]?.id ?? manualRisk.id;
  summary.createdEntities.riskRegisterItemId = primaryRiskId;

  await requestJson(
    'Pulse risk detail',
    `/api/pulse/risks/${primaryRiskId}`,
    {},
    'pulse-risk-detail'
  );

  await requestJson(
    'Update pulse risk',
    `/api/pulse/risks/${primaryRiskId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'IN_REVIEW',
        severity: 'HIGH',
        ownerUserId: reviewerUserId,
        targetDueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        reviewNotes: 'Validation harness updated the owner and target date.'
      })
    },
    'pulse-risk-updated'
  );

  await requestJson(
    'List pulse risks filtered',
    '/api/pulse/risks?status=OPEN&severity=HIGH',
    {},
    'pulse-risks-filtered'
  );

  const { payload: roadmap } = await requestJson<{
    id: string;
    name: string;
    status: string;
    items: Array<{ id: string; title: string; horizon: string; status: string }>;
  }>(
    'Generate pulse roadmap',
    '/api/pulse/roadmaps',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snapshotId: pulseSnapshot.id
      })
    },
    'pulse-roadmap-created'
  );
  summary.createdEntities.pulseRoadmapId = roadmap.id;
  summary.createdEntities.pulseRoadmapItemCount = roadmap.items.length;
  if (roadmap.items[0]) {
    summary.createdEntities.pulseRoadmapItemId = roadmap.items[0].id;
  }

  await requestJson(
    'Pulse roadmap detail',
    `/api/pulse/roadmaps/${roadmap.id}`,
    {},
    'pulse-roadmap-detail'
  );

  await requestJson(
    'Update pulse roadmap',
    `/api/pulse/roadmaps/${roadmap.id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'NEEDS_REVIEW',
        reviewerNotes: 'Validation harness requested operator review before executive circulation.'
      })
    },
    'pulse-roadmap-updated'
  );

  if (roadmap.items[0]) {
    await requestJson(
      'Update pulse roadmap item',
      `/api/pulse/roadmaps/items/${roadmap.items[0].id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerUserId: reviewerUserId,
          dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'IN_PROGRESS',
          rationale: 'Validation harness moved the highest-priority item into active execution.',
          expectedImpact: 'Improves executive posture confidence and buyer-readiness coverage.'
        })
      },
      'pulse-roadmap-item-updated'
    );
  }

  const { payload: boardBrief } = await requestJson<{
    id: string;
    title: string;
    status: string;
  }>(
    'Generate pulse board brief',
    '/api/pulse/board-briefs',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snapshotId: pulseSnapshot.id,
        roadmapId: roadmap.id
      })
    },
    'pulse-board-brief-created'
  );
  summary.createdEntities.boardBriefId = boardBrief.id;

  await requestJson(
    'Pulse board brief detail',
    `/api/pulse/board-briefs/${boardBrief.id}`,
    {},
    'pulse-board-brief-detail'
  );

  await requestJsonWithExpectedStatus<{ error: string }>(
    'Board brief export blocked before approval',
    `/api/pulse/board-briefs/${boardBrief.id}/export?format=html`,
    409,
    {},
    'pulse-board-brief-export-blocked'
  );

  await requestJson(
    'Mark board brief needs review',
    `/api/pulse/board-briefs/${boardBrief.id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'NEEDS_REVIEW',
        reviewerNotes: 'Validation harness marked the brief for executive review.'
      })
    },
    'pulse-board-brief-needs-review'
  );

  await requestJson(
    'Approve pulse board brief',
    `/api/pulse/board-briefs/${boardBrief.id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'APPROVED',
        reviewerNotes: 'Approved for executive distribution during validation.'
      })
    },
    'pulse-board-brief-approved'
  );

  await requestBinary(
    'Export board brief HTML',
    `/api/pulse/board-briefs/${boardBrief.id}/export?format=html`,
    DOWNLOAD_ROOT,
    'board-brief.html'
  );
  await requestBinary(
    'Export board brief Markdown',
    `/api/pulse/board-briefs/${boardBrief.id}/export?format=markdown`,
    DOWNLOAD_ROOT,
    'board-brief.md'
  );
  await requestBinary(
    'Export board brief JSON',
    `/api/pulse/board-briefs/${boardBrief.id}/export?format=json`,
    DOWNLOAD_ROOT,
    'board-brief.json'
  );

  const { payload: quarterlyReview } = await requestJson<{
    id: string;
    reviewPeriod: string;
    status: string;
  }>(
    'Prepare quarterly review',
    '/api/pulse/quarterly-reviews',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snapshotId: pulseSnapshot.id,
        roadmapId: roadmap.id,
        boardBriefId: boardBrief.id
      })
    },
    'pulse-quarterly-review-created'
  );
  summary.createdEntities.quarterlyReviewId = quarterlyReview.id;

  await requestJson(
    'Quarterly review detail',
    `/api/pulse/quarterly-reviews/${quarterlyReview.id}`,
    {},
    'pulse-quarterly-review-detail'
  );

  await requestJson(
    'Update quarterly review',
    `/api/pulse/quarterly-reviews/${quarterlyReview.id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attendeeNames: ['Security Lead', 'Operations Lead', 'CEO'],
        notes: 'Validation harness prepared the recurring executive review record.',
        decisionsMade: ['Confirm ownership for trust evidence refresh'],
        followUpActions: ['Track vendor access review cadence in the next roadmap refresh']
      })
    },
    'pulse-quarterly-review-updated'
  );

  await requestJson(
    'Finalize quarterly review',
    `/api/pulse/quarterly-reviews/${quarterlyReview.id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attendeeNames: ['Security Lead', 'Operations Lead', 'CEO'],
        notes: 'Validation harness finalized the recurring executive review record.',
        decisionsMade: ['Confirm ownership for trust evidence refresh'],
        followUpActions: ['Track vendor access review cadence in the next roadmap refresh'],
        status: 'FINALIZED'
      })
    },
    'pulse-quarterly-review-finalized'
  );

  await requestJson(
    'Publish pulse snapshot',
    `/api/pulse/snapshots/${pulseSnapshot.id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'PUBLISHED'
      })
    },
    'pulse-snapshot-published'
  );

  const { payload: aiVendorReview } = await requestJson<{
    id: string;
    status: string;
    riskTier: string;
    linkedFindingIds: string[];
    linkedRiskIds: string[];
    linkedTaskIds: string[];
  }>(
    'Create AI vendor intake',
    '/api/ai-governance/vendors',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendorName: 'Validation AI Vendor',
        productName: 'Validation Assistant',
        primaryUseCase: 'Customer support knowledge assistant with governed AI usage.',
        modelProvider: 'OpenAI',
        deploymentType: 'SAAS',
        authenticationSupport: 'YES',
        loggingSupport: 'UNKNOWN',
        retentionPolicyStatus: 'UNKNOWN',
        trainsOnCustomerData: 'UNKNOWN',
        subprocessorsStatus: 'UNKNOWN',
        dpaStatus: 'REQUESTED',
        securityDocsRequested: true,
        securityDocsReceived: false,
        dataClasses: ['CUSTOMER_DATA', 'CONFIDENTIAL'],
        riskNotes: 'Validation harness is testing AI vendor intake conditions and review gating.',
        ownerUserId: reviewerUserId,
        assignedReviewerUserId: reviewerUserId,
        reviewDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        linkedPolicyIds: ['acceptable-use-policy', 'third-party-risk-management-policy']
      })
    },
    'ai-governance-vendor-created'
  );
  summary.createdEntities.aiVendorReviewId = aiVendorReview.id;

  const { payload: aiUseCase } = await requestJson<{
    id: string;
    status: string;
    riskTier: string;
    linkedFindingIds: string[];
    linkedRiskIds: string[];
    linkedTaskIds: string[];
  }>(
    'Create AI use case',
    '/api/ai-governance/use-cases',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Validation AI Use Case',
        description:
          'Customer support analysts use an AI assistant to summarize customer issues and draft internal response recommendations.',
        businessOwner: 'Support Operations',
        department: 'Customer Support',
        useCaseType: 'CUSTOMER_FACING',
        workflowType: 'ASSISTANT',
        vendorName: 'Validation AI Vendor',
        vendorReviewId: aiVendorReview.id,
        modelFamily: 'gpt-4o-mini',
        deploymentContext: 'SAAS',
        dataClasses: ['CUSTOMER_DATA', 'CUSTOMER_CONTENT', 'CONFIDENTIAL'],
        customerDataInvolved: 'YES',
        regulatedDataInvolved: 'NO',
        secretsInvolved: 'NO',
        externalToolAccess: 'NO',
        internetAccess: 'YES',
        humanReviewRequired: true,
        linkedPolicyIds: ['acceptable-use-policy', 'data-classification-policy'],
        assignedReviewerUserId: reviewerUserId,
        reviewDueAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
      })
    },
    'ai-governance-use-case-created'
  );
  summary.createdEntities.aiUseCaseId = aiUseCase.id;

  await requestJsonWithExpectedStatus(
    'Block direct AI use case approval while blockers remain',
    `/api/ai-governance/use-cases/${aiUseCase.id}`,
    400,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'APPROVED'
      })
    },
    'ai-governance-use-case-approval-blocked'
  );

  await requestJson(
    'Conditionally approve AI vendor intake',
    `/api/ai-governance/vendors/${aiVendorReview.id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loggingSupport: 'YES',
        retentionPolicyStatus: 'KNOWN',
        subprocessorsStatus: 'YES',
        securityDocsReceived: true,
        reviewerNotes: 'Validation harness recorded required vendor follow-up and documented conditions.',
        decisionConditions: [
          'Complete production logging verification before broad rollout.',
          'Confirm DPA completion before customer-facing expansion.'
        ],
        status: 'APPROVED_WITH_CONDITIONS'
      })
    },
    'ai-governance-vendor-conditionally-approved'
  );

  await requestJson(
    'Reject AI use case',
    `/api/ai-governance/use-cases/${aiUseCase.id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewerNotes:
          'Validation harness rejected the use case because customer-facing AI output should not proceed until vendor and policy conditions are fully resolved.',
        status: 'REJECTED'
      })
    },
    'ai-governance-use-case-rejected'
  );

  await requestJson(
    'List AI use cases',
    '/api/ai-governance/use-cases?status=REJECTED',
    {},
    'ai-governance-use-cases'
  );
  await requestJson(
    'AI use case detail',
    `/api/ai-governance/use-cases/${aiUseCase.id}`,
    {},
    'ai-governance-use-case-detail'
  );
  await requestJson(
    'List AI vendor reviews',
    '/api/ai-governance/vendors?status=APPROVED_WITH_CONDITIONS',
    {},
    'ai-governance-vendors'
  );
  await requestJson(
    'AI vendor review detail',
    `/api/ai-governance/vendors/${aiVendorReview.id}`,
    {},
    'ai-governance-vendor-detail'
  );
  await requestJson(
    'AI Governance review queue',
    '/api/ai-governance/reviews',
    {},
    'ai-governance-review-queue'
  );
  await requestJson(
    'AI Governance summary',
    '/api/ai-governance/summary',
    {},
    'ai-governance-summary'
  );
  await requestJson('List findings after AI Governance sync', '/api/findings', {}, 'findings-after-ai-governance');

  await requestJson('List pulse snapshots', '/api/pulse/snapshots', {}, 'pulse-snapshots');
  await requestJson('List pulse risks', '/api/pulse/risks', {}, 'pulse-risks');
  await requestJson('List pulse roadmaps', '/api/pulse/roadmaps', {}, 'pulse-roadmaps');
  await requestJson('List pulse board briefs', '/api/pulse/board-briefs', {}, 'pulse-board-briefs');
  await requestJson('List quarterly reviews', '/api/pulse/quarterly-reviews', {}, 'pulse-quarterly-reviews');

  await requestJson('List questionnaires', '/api/questionnaires', {}, 'questionnaire-list');
  await requestJson('Questionnaire detail', `/api/questionnaires/${questionnaire.id}`, {}, 'questionnaire-detail');
  await requestJson(
    'Get evidence map',
    `/api/questionnaires/${questionnaire.id}/evidence-map`,
    {},
    'questionnaire-evidence-map-detail'
  );
  await requestJson('List trust inbox items', '/api/trust/inbox', {}, 'trust-inbox-list');
  await requestJson('Trust inbox detail', `/api/trust/inbox/${trustItem.id}`, {}, 'trust-inbox-detail');
  await requestJson('List trust packets', '/api/trust/packets', {}, 'trust-packets');

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
      '/app/ai-governance',
      '/app/ai-governance/use-cases',
      '/app/ai-governance/vendors',
      '/app/ai-governance/reviews',
      '/app/pulse',
      '/app/pulse/risks',
      '/app/pulse/roadmap',
      '/app/response-ops',
      '/app/security-analyst',
      '/app/cyber-range',
      '/app/runbooks',
      '/app/policies',
      '/app/evidence',
      '/app/assessments',
      '/app/questionnaires',
      '/app/trust',
      '/app/trust/reviews',
      '/app/trust/answer-library',
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
    if (summary.createdEntities.evidenceMapId) {
      routes.add(`/app/trust/evidence-maps/${summary.createdEntities.evidenceMapId}`);
    }
    if (summary.createdEntities.trustInboxItemId) {
      routes.add(`/app/trust/inbox/${summary.createdEntities.trustInboxItemId}`);
    }
    if (summary.createdEntities.templateId) {
      routes.add(`/app/templates/${summary.createdEntities.templateId}`);
    }
    if (summary.createdEntities.pulseSnapshotId) {
      routes.add(`/app/pulse/snapshots/${summary.createdEntities.pulseSnapshotId}`);
    }
    if (summary.createdEntities.boardBriefId) {
      routes.add(`/app/pulse/board-briefs/${summary.createdEntities.boardBriefId}`);
    }
    if (summary.createdEntities.quarterlyReviewId) {
      routes.add(`/app/pulse/quarterly-reviews/${summary.createdEntities.quarterlyReviewId}`);
    }
    if (summary.createdEntities.aiUseCaseId) {
      routes.add(`/app/ai-governance/use-cases/${summary.createdEntities.aiUseCaseId}`);
    }
    if (summary.createdEntities.aiVendorReviewId) {
      routes.add(`/app/ai-governance/vendors/${summary.createdEntities.aiVendorReviewId}`);
    }
    if (summary.createdEntities.incidentId) {
      routes.add(`/app/response-ops/incidents/${summary.createdEntities.incidentId}`);
    }
    if (summary.createdEntities.tabletopId) {
      routes.add(`/app/response-ops/tabletops/${summary.createdEntities.tabletopId}`);
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
      .locator('textarea[placeholder*="guided workflow"], textarea')
      .first()
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

    await page.goto(`${BASE_URL}/app/trust`, { waitUntil: 'domcontentloaded' });
    await waitForAppPage(page);
    if (summary.createdEntities.trustPacketId) {
      await saveDownloadFromClick(page, 'Trust packet HTML (UI)', async () => {
        await page.getByRole('button', { name: 'Export HTML' }).first().click();
      });
    }
    await page.screenshot({ path: path.join(UI_ROOT, 'trustops-workflows.png'), fullPage: true });

    await page.goto(`${BASE_URL}/app/pulse`, { waitUntil: 'domcontentloaded' });
    await waitForAppPage(page);
    await page.screenshot({ path: path.join(UI_ROOT, 'pulse-dashboard.png'), fullPage: true });

    await page.goto(`${BASE_URL}/app/response-ops`, { waitUntil: 'domcontentloaded' });
    await waitForAppPage(page);
    await page.getByPlaceholder('Search incidents by title, type, severity, or status').fill('validation');
    await page.screenshot({ path: path.join(UI_ROOT, 'response-ops-dashboard.png'), fullPage: true });

    if (summary.createdEntities.incidentId) {
      await page.goto(`${BASE_URL}/app/response-ops/incidents/${summary.createdEntities.incidentId}`, {
        waitUntil: 'domcontentloaded'
      });
      await waitForAppPage(page);
      if (summary.createdEntities.afterActionReportId) {
        await saveDownloadFromClick(page, 'After-action HTML (UI)', async () => {
          await page.getByRole('link', { name: 'Export HTML' }).click();
        });
      }
      await page.screenshot({ path: path.join(UI_ROOT, 'response-ops-incident-detail.png'), fullPage: true });
    }

    if (summary.createdEntities.tabletopId) {
      await page.goto(`${BASE_URL}/app/response-ops/tabletops/${summary.createdEntities.tabletopId}`, {
        waitUntil: 'domcontentloaded'
      });
      await waitForAppPage(page);
      await page.screenshot({ path: path.join(UI_ROOT, 'response-ops-tabletop-detail.png'), fullPage: true });
    }

    if (summary.createdEntities.boardBriefId) {
      await page.goto(`${BASE_URL}/app/pulse/board-briefs/${summary.createdEntities.boardBriefId}`, {
        waitUntil: 'domcontentloaded'
      });
      await waitForAppPage(page);
      await saveDownloadFromClick(page, 'Board brief HTML (UI)', async () => {
        await page.getByRole('link', { name: 'Export HTML' }).click();
      });
      await page.screenshot({ path: path.join(UI_ROOT, 'pulse-board-brief.png'), fullPage: true });
    }

    if (summary.createdEntities.quarterlyReviewId) {
      await page.goto(`${BASE_URL}/app/pulse/quarterly-reviews/${summary.createdEntities.quarterlyReviewId}`, {
        waitUntil: 'domcontentloaded'
      });
      await waitForAppPage(page);
      await page.screenshot({ path: path.join(UI_ROOT, 'pulse-quarterly-review.png'), fullPage: true });
    }
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
