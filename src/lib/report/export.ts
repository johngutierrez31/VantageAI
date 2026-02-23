import { Report, TenantBranding } from '@prisma/client';

type BrandingInput = TenantBranding | null;

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

export function buildReportExport(
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
    return {
      body: html,
      contentType: 'text/html; charset=utf-8',
      extension: 'html'
    };
  }

  return {
    body: html,
    contentType: 'text/html; charset=utf-8',
    extension: 'html'
  };
}
