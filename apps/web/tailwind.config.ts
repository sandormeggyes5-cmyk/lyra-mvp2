import type { Config } from 'tailwindcss';

// Werte spiegeln apps/web/src/styles/tokens.css — Farben/Radius/Schatten/
// Motion als CSS-Variablen definiert, hier für Tailwind-Utilities nutzbar
// gemacht. Strukturell an DESIGN.md (Linear-Analyse) angelehnt, eigene
// Lyra-Markenidentität (siehe Phase-3-Konzept).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
          DEFAULT: 'var(--color-primary-600)',
        },
        accent: {
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          tint: 'var(--color-accent-tint)',
          DEFAULT: 'var(--color-accent-500)',
        },
        neutral: {
          25: 'var(--color-neutral-0)',
          50: 'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
        },
        success: { DEFAULT: 'var(--color-success)', tint: 'var(--color-success-tint)' },
        warning: { DEFAULT: 'var(--color-warning)', tint: 'var(--color-warning-tint)' },
        danger: { DEFAULT: 'var(--color-danger)', tint: 'var(--color-danger-tint)' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        'display-lg': ['var(--text-display-lg-size)', { lineHeight: 'var(--text-display-lg-leading)', letterSpacing: 'var(--text-display-lg-tracking)', fontWeight: 'var(--text-display-lg-weight)' }],
        'display-md': ['var(--text-display-md-size)', { lineHeight: 'var(--text-display-md-leading)', letterSpacing: 'var(--text-display-md-tracking)', fontWeight: 'var(--text-display-md-weight)' }],
        headline: ['var(--text-headline-size)', { lineHeight: 'var(--text-headline-leading)', letterSpacing: 'var(--text-headline-tracking)', fontWeight: 'var(--text-headline-weight)' }],
        subhead: ['var(--text-subhead-size)', { lineHeight: 'var(--text-subhead-leading)', fontWeight: 'var(--text-subhead-weight)' }],
        body: ['var(--text-body-size)', { lineHeight: 'var(--text-body-leading)', fontWeight: 'var(--text-body-weight)' }],
        'body-sm': ['var(--text-body-sm-size)', { lineHeight: 'var(--text-body-sm-leading)', fontWeight: 'var(--text-body-sm-weight)' }],
        caption: ['var(--text-caption-size)', { lineHeight: 'var(--text-caption-leading)', letterSpacing: 'var(--text-caption-tracking)', fontWeight: 'var(--text-caption-weight)' }],
        button: ['var(--text-button-size)', { lineHeight: 'var(--text-button-leading)', fontWeight: 'var(--text-button-weight)' }],
      },
      spacing: {
        xxs: 'var(--space-xxs)',
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
        xxl: 'var(--space-xxl)',
        section: 'var(--space-section)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        xxl: 'var(--radius-xxl)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        'focus-ring': 'var(--shadow-focus-ring)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
        warm: 'var(--ease-warm)',
      },
    },
  },
  plugins: [],
} satisfies Config;
