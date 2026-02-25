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
    sm: '0.25rem',
    md: '0.25rem',
    lg: '0.25rem'
  },
  shadows: {
    soft: '0 8px 24px rgba(0, 0, 0, 0.3)',
    panel: '0 10px 30px rgba(0, 0, 0, 0.35)'
  },
  typography: {
    pageTitle: 'font-serif text-4xl font-medium tracking-tight',
    sectionTitle: 'font-serif text-2xl font-medium tracking-tight',
    body: 'font-sans text-base text-muted-foreground',
    monoLabel: 'font-display text-xs uppercase tracking-[0.2em]'
  },
  semanticColors: {
    success: 'hsl(144 45% 45%)',
    warning: 'hsl(40 68% 54%)',
    danger: 'hsl(351 57% 35%)'
  }
} as const;

export type ThemeTokens = typeof themeTokens;

export const academiaThemeTokens = {
  colors: {
    background: '#1C1714',
    backgroundAlt: '#251E19',
    foreground: '#E8DFD4',
    muted: '#3D332B',
    mutedForeground: '#9C8B7A',
    accent: '#C9A962',
    accentSecondary: '#8B2635',
    border: '#4A3F35'
  },
  fonts: {
    heading: '"Cormorant Garamond", serif',
    body: '"Crimson Pro", serif',
    display: '"Cinzel", serif'
  },
  radius: {
    default: '4px',
    arch: '40% 40% 0 0 / 20% 20% 0 0'
  },
  transitions: {
    fast: '150ms',
    base: '300ms',
    slow: '500ms',
    dramatic: '700ms'
  }
} as const;

export const retroThemeTokens = {
  colors: {
    background: '#C0C0C0',
    foreground: '#000000',
    muted: '#808080',
    accent: '#0000FF',
    secondary: '#FF0000',
    tertiary: '#FFFF00',
    success: '#00FF00',
    successDark: '#00AA00',
    border: '#000000',
    borderLight: '#FFFFFF',
    borderDark: '#808080',
    titleBar: '#000080',
    titleBarGradientEnd: '#1084D0',
    panelYellow: '#FFFFCC',
    visitedLink: '#800080',
    hoverLink: '#FF0000'
  },
  typography: {
    body: '"MS Sans Serif", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    heading: '"Arial Black", Impact, Haettenschweiler, sans-serif',
    mono: '"Courier New", Courier, monospace',
    playful: '"Comic Sans MS", cursive'
  },
  bevel: {
    outsetBorderColor: '#FFFFFF #808080 #808080 #FFFFFF',
    insetBorderColor: '#808080 #FFFFFF #FFFFFF #808080',
    outsetShadow: 'inset -1px -1px 0 #404040, inset 1px 1px 0 #DFDFDF',
    insetShadow: 'inset 1px 1px 0 #404040, inset -1px -1px 0 #DFDFDF'
  },
  radius: {
    all: '0px'
  }
} as const;
