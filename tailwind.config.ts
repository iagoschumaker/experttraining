import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Shadcn/UI — CSS Variables (tema claro/escuro via globals.css)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        // =============================================
        // KINEX PERFORMANCE — Paleta da Proposta Premium
        // Fonte: docs/proposta-juba/style.css
        // =============================================

        // Primary: Gold — cor exata da proposta
        primary: {
          DEFAULT: 'hsl(var(--primary))',       // #d4a830 via CSS var
          foreground: 'hsl(var(--primary-foreground))',
          // Variantes fixas para uso direto
          gold: '#d4a830',
          light: '#f0d060',
          dim: 'rgba(212, 168, 48, 0.15)',
          border: 'rgba(212, 168, 48, 0.35)',
          glow: 'rgba(212, 168, 48, 0.25)',
        },

        // Backgrounds — da proposta
        'kinex-black': {
          deep: '#0a0a0a',    // --black-deep
          soft: '#111111',    // --black-soft
          card: '#161616',    // --black-card
          border: '#222222',  // --black-border
        },

        // Grays — da proposta
        'kinex-gray': {
          muted: '#6b6b6b',   // --gray-muted
          light: '#9a9a9a',   // --gray-light
        },

        // Whites — da proposta
        'kinex-white': {
          pure: '#ffffff',
          soft: '#f0f0f0',    // --white-soft
        },

        // Status
        success: {
          DEFAULT: '#22C55E',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#d4a830',   // usa o gold, não amarelo neutro
          foreground: '#0a0a0a',
        },
        error: {
          DEFAULT: '#EF4444',
          foreground: '#ffffff',
        },
        info: {
          DEFAULT: '#d4a830',   // gold no lugar do cyan
          foreground: '#0a0a0a',
        },

        // Shadcn required
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in-from-top': {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in-from-top 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
