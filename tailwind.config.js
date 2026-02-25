/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        'background-alt': 'hsl(var(--background-alt))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        border: 'hsl(var(--border))',
        'accent-secondary': 'hsl(var(--accent-secondary))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        danger: 'hsl(var(--danger))'
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)'
      },
      boxShadow: {
        panel: '0 10px 30px rgba(0, 0, 0, 0.35)'
      },
      fontFamily: {
        sans: ['var(--font-body)', 'ui-serif', 'Georgia', 'serif'],
        serif: ['var(--font-heading)', 'Georgia', 'Times New Roman', 'serif'],
        display: ['var(--font-display)', 'Georgia', 'Times New Roman', 'serif']
      }
    }
  },
  plugins: [],
};
