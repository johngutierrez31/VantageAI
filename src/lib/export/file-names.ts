export function slugifyExportName(value: string, fallback = 'export') {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

export function buildSuiteExportBaseName(scope: string, title: string, detail?: string | null) {
  const parts = ['vantageai', slugifyExportName(scope), slugifyExportName(title)];

  if (detail?.trim()) {
    parts.push(slugifyExportName(detail));
  }

  return parts.join('-');
}
