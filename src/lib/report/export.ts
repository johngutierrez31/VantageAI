import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { Report, TenantBranding } from '@prisma/client';

type BrandingInput = TenantBranding | null;
type ReportView = 'executive' | 'detailed';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderReportHtml(report: Report, branding: BrandingInput, tenantName: string) {
  const primaryColor = branding?.primaryColor ?? '#0f172a';
  const accentColor = branding?.accentColor ?? '#2563eb';
  const companyName = branding?.companyName ?? tenantName;
  const footerNote = branding?.footerNote ?? 'Not legal advice.';

  const markdownHtml = escapeHtml(report.markdown)
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    :root {
      --primary: ${primaryColor};
      --accent: ${accentColor};
    }
    body {
      margin: 0;
      font-family: 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(160deg, #f8fafc, #e2e8f0);
      color: #0f172a;
      padding: 24px;
    }
    .sheet {
      max-width: 920px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
    }
    .header {
      padding: 28px;
      background: linear-gradient(120deg, var(--primary), var(--accent));
      color: #f8fafc;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .header p {
      margin: 8px 0 0;
      opacity: 0.9;
    }
    .content {
      padding: 26px;
      line-height: 1.6;
    }
    .content h1,
    .content h2 {
      color: var(--primary);
    }
    .content li {
      margin-left: 18px;
    }
    .footer {
      padding: 18px 26px;
      border-top: 1px solid #e2e8f0;
      color: #475569;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <h1>${escapeHtml(report.title)}</h1>
      <p>${escapeHtml(companyName)} | ${escapeHtml(new Date(report.createdAt).toISOString())}</p>
    </div>
    <div class="content">
      <p>${markdownHtml}</p>
    </div>
    <div class="footer">${escapeHtml(footerNote)}</div>
  </div>
</body>
</html>`;
}

function normalizeMarkdownLines(markdown: string) {
  return markdown
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trimEnd());
}

function getReportPayload(report: Report) {
  if (!report.jsonPayload || typeof report.jsonPayload !== 'object' || Array.isArray(report.jsonPayload)) {
    return {} as Record<string, unknown>;
  }

  return report.jsonPayload as Record<string, unknown>;
}

async function renderReportPdf(
  report: Report,
  branding: BrandingInput,
  tenantName: string,
  view: ReportView
) {
  const companyName = branding?.companyName ?? tenantName;
  const primaryColor = branding?.primaryColor ?? '#0f172a';
  const footerNote = branding?.footerNote ?? 'Not legal advice.';
  const payload = getReportPayload(report);
  const score = payload.score as
    | {
        overall?: number;
        confidence?: number;
        byDomain?: Record<string, number>;
      }
    | undefined;
  const topGaps =
    ((payload.topGaps as Array<{ controlCode?: string; score?: number; gap?: number }> | undefined) ?? []).slice(0, 6);

  const pdf = await PDFDocument.create();
  pdf.setTitle(report.title);
  pdf.setAuthor(companyName);
  pdf.setSubject(`${view === 'executive' ? 'Executive' : 'Detailed'} assessment report`);

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = 612;
  const height = 792;
  const margin = 54;
  const textColor = rgb(17 / 255, 24 / 255, 39 / 255);
  const mutedColor = rgb(71 / 255, 85 / 255, 105 / 255);
  const lineHeight = 15;

  function toRgb(hex: string) {
    const normalized = hex.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
      return rgb(15 / 255, 23 / 255, 42 / 255);
    }

    return rgb(
      Number.parseInt(normalized.slice(0, 2), 16) / 255,
      Number.parseInt(normalized.slice(2, 4), 16) / 255,
      Number.parseInt(normalized.slice(4, 6), 16) / 255
    );
  }

  function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return [''];

    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }

    if (current) lines.push(current);
    return lines;
  }

  let page = pdf.addPage([width, height]);
  let cursorY = height - margin;
  const primaryRgb = toRgb(primaryColor);

  function newPage() {
    page = pdf.addPage([width, height]);
    cursorY = height - margin;
  }

  function ensureSpace(requiredHeight: number) {
    if (cursorY - requiredHeight <= margin) {
      newPage();
    }
  }

  function drawTextBlock(text: string, font: PDFFont, size: number, color: ReturnType<typeof rgb>, indent = 0) {
    const maxWidth = width - margin * 2 - indent;
    const lines = wrapText(text, font, size, maxWidth);
    for (const line of lines) {
      ensureSpace(lineHeight + 2);
      page.drawText(line, {
        x: margin + indent,
        y: cursorY,
        size,
        font,
        color
      });
      cursorY -= lineHeight;
    }
  }

  drawTextBlock(report.title, bold, 22, primaryRgb);
  cursorY -= 4;
  drawTextBlock(`${companyName} | ${new Date(report.createdAt).toLocaleString()}`, regular, 10, mutedColor);
  cursorY -= 12;

  ensureSpace(88);
  page.drawRectangle({
    x: margin,
    y: cursorY - 64,
    width: width - margin * 2,
    height: 72,
    borderColor: primaryRgb,
    borderWidth: 1,
    color: rgb(248 / 255, 250 / 255, 252 / 255)
  });
  page.drawText(view === 'executive' ? 'Executive Scorecard' : 'Assessment Snapshot', {
    x: margin + 14,
    y: cursorY - 18,
    size: 12,
    font: bold,
    color: primaryRgb
  });
  page.drawText(`Overall Score: ${score?.overall ?? 'N/A'} / 4`, {
    x: margin + 14,
    y: cursorY - 36,
    size: 10,
    font: regular,
    color: textColor
  });
  page.drawText(
    `Confidence: ${typeof score?.confidence === 'number' ? `${Math.round(score.confidence * 100)}%` : 'N/A'}`,
    {
      x: margin + 14,
      y: cursorY - 50,
      size: 10,
      font: regular,
      color: textColor
    }
  );
  page.drawText(`Report ID: ${report.id}`, {
    x: margin + 14,
    y: cursorY - 64,
    size: 10,
    font: regular,
    color: textColor
  });
  cursorY -= 92;

  if (view === 'executive') {
    drawTextBlock('Top Gaps', bold, 14, primaryRgb);
    cursorY -= 4;

    if (topGaps.length === 0) {
      drawTextBlock('No major gaps identified.', regular, 11, textColor);
    } else {
      for (const gap of topGaps) {
        const label = gap.controlCode ?? 'Unknown control';
        const gapScore = typeof gap.score === 'number' ? `${gap.score}/4` : 'unscored';
        drawTextBlock(`- ${label} (${gapScore})`, regular, 11, textColor, 10);
      }
    }

    const byDomain = Object.entries(score?.byDomain ?? {});
    if (byDomain.length) {
      cursorY -= 8;
      drawTextBlock('Domain Scores', bold, 14, primaryRgb);
      cursorY -= 4;
      for (const [domain, value] of byDomain) {
        drawTextBlock(`- ${domain}: ${value}/4`, regular, 11, textColor, 10);
      }
    }
  } else {
    drawTextBlock('Detailed Findings', bold, 14, primaryRgb);
    cursorY -= 4;

    for (const rawLine of normalizeMarkdownLines(report.markdown)) {
      const line = rawLine.trim();
      if (!line) {
        cursorY -= 6;
        continue;
      }

      if (line.startsWith('# ')) {
        drawTextBlock(line.slice(2), bold, 16, primaryRgb);
        cursorY -= 4;
        continue;
      }

      if (line.startsWith('## ')) {
        drawTextBlock(line.slice(3), bold, 14, primaryRgb);
        cursorY -= 2;
        continue;
      }

      if (line.startsWith('- ')) {
        drawTextBlock(`- ${line.slice(2)}`, regular, 11, textColor, 10);
        continue;
      }

      drawTextBlock(line, regular, 11, textColor);
    }
  }

  cursorY -= 10;
  drawTextBlock(footerNote, regular, 9, mutedColor);

  return Buffer.from(await pdf.save());
}

function renderExecutiveHtml(report: Report, branding: BrandingInput, tenantName: string) {
  const payload = typeof report.jsonPayload === 'object' && report.jsonPayload ? (report.jsonPayload as Record<string, unknown>) : {};
  const score = payload.score as { overall?: number; confidence?: number; byDomain?: Record<string, number> } | undefined;
  const topGaps = (payload.topGaps as Array<{ controlCode?: string; score?: number }> | undefined) ?? [];
  const primaryColor = branding?.primaryColor ?? '#0f172a';
  const accentColor = branding?.accentColor ?? '#2563eb';
  const companyName = branding?.companyName ?? tenantName;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)} (Executive)</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #0f172a; }
    .panel { max-width: 900px; margin: 0 auto; border: 1px solid #dbe4ff; border-radius: 16px; background: white; overflow: hidden; }
    .header { padding: 24px; color: #f8fafc; background: linear-gradient(120deg, ${primaryColor}, ${accentColor}); }
    .section { padding: 20px 24px; border-top: 1px solid #e2e8f0; }
    .kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .kpi { border: 1px solid #dbe4ff; border-radius: 12px; padding: 12px; }
    .muted { color: #475569; font-size: 13px; }
  </style>
</head>
<body>
  <div class="panel">
    <div class="header">
      <h1 style="margin:0;">${escapeHtml(report.title)}</h1>
      <p style="margin:8px 0 0;">${escapeHtml(companyName)} - Executive Scorecard</p>
    </div>
    <div class="section">
      <div class="kpis">
        <div class="kpi"><div class="muted">Overall score</div><div style="font-size:24px;font-weight:700;">${score?.overall ?? 'N/A'} / 4</div></div>
        <div class="kpi"><div class="muted">Confidence</div><div style="font-size:24px;font-weight:700;">${
          score?.confidence ? Math.round(score.confidence * 100) : 'N/A'
        }%</div></div>
        <div class="kpi"><div class="muted">Generated</div><div style="font-size:16px;font-weight:600;">${escapeHtml(
          new Date(report.createdAt).toISOString().slice(0, 10)
        )}</div></div>
      </div>
    </div>
    <div class="section">
      <h2 style="margin:0 0 10px;">Top gaps</h2>
      <ul style="margin:0;padding-left:20px;">
        ${
          topGaps.length
            ? topGaps
                .slice(0, 5)
                .map((gap) => `<li>${escapeHtml(gap.controlCode ?? 'Unknown')} (${gap.score ?? 0}/4)</li>`)
                .join('')
            : '<li>No major gaps identified.</li>'
        }
      </ul>
    </div>
  </div>
</body>
</html>`;
}

export async function buildReportExport(
  report: Report,
  branding: BrandingInput,
  tenantName: string,
  format: 'html' | 'markdown' | 'json' | 'pdf',
  options?: { view?: 'executive' | 'detailed' }
) {
  if (format === 'json') {
    return {
      body: JSON.stringify(report.jsonPayload, null, 2),
      contentType: 'application/json',
      extension: 'json'
    };
  }

  if (format === 'markdown') {
    return {
      body: report.markdown,
      contentType: 'text/markdown; charset=utf-8',
      extension: 'md'
    };
  }

  const view = options?.view ?? 'detailed';
  const html = view === 'executive' ? renderExecutiveHtml(report, branding, tenantName) : renderReportHtml(report, branding, tenantName);

  if (format === 'pdf') {
    const pdf = await renderReportPdf(report, branding, tenantName, view);
    return {
      body: pdf,
      contentType: 'application/pdf',
      extension: 'pdf'
    };
  }

  return {
    body: html,
    contentType: 'text/html; charset=utf-8',
    extension: 'html'
  };
}
