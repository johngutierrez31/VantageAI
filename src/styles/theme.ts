export const themeTokens = {
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '2rem',
    '3xl': '3rem'
  },
  radii: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem'
  },
  shadows: {
    soft: '0 8px 24px rgba(2, 12, 27, 0.18)',
    panel: '0 10px 30px rgba(2, 12, 27, 0.28)'
  },
  typography: {
    pageTitle: 'text-3xl font-semibold tracking-tight',
    sectionTitle: 'text-xl font-semibold tracking-tight',
    body: 'text-sm text-muted-foreground',
    monoLabel: 'font-mono text-xs uppercase tracking-wide'
  },
  semanticColors: {
    success: 'hsl(142 76% 42%)',
    warning: 'hsl(40 96% 58%)',
    danger: 'hsl(0 84% 60%)'
  }
} as const;

export type ThemeTokens = typeof themeTokens;
