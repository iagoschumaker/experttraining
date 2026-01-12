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
        // Shadcn compatibility
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        
        // Expert Training Design System
        // Base Backgrounds
        'bg-primary': {
          DEFAULT: '#0F1215', // Dark: Cinza carvão
          light: '#FFFFFF',   // Light: Branco
        },
        'bg-secondary': {
          DEFAULT: '#151A1F', // Dark: Cinza grafite
          light: '#F5F7FA',   // Light: Cinza muito claro
        },
        'surface': {
          DEFAULT: '#1C232B', // Dark: Cards/containers
          light: '#FFFFFF',   // Light: Cards
          hover: '#2A333D',   // Dark: Hover state
        },
        'border-color': {
          DEFAULT: '#2A333D', // Dark: Bordas
          light: '#E2E8F0',   // Light: Bordas
          divider: '#323C47', // Dark: Divisores
        },
        
        // Expert Training Primary (Azul Ciano)
        primary: {
          DEFAULT: '#00C2D1',
          hover: '#00A9B6',
          active: '#008E99',
          focus: '#33D6E2',
          foreground: '#FFFFFF',
        },
        
        // Expert Training Accent (Amarelo Mostarda)
        accent: {
          DEFAULT: '#F2B705',
          hover: '#D9A404',
          soft: '#3A2E0A',
          'soft-light': '#FFF4CC',
          foreground: '#000000',
        },
        
        // Text colors
        'text-primary': {
          DEFAULT: '#E6EAF0', // Dark: Branco suave
          light: '#0F172A',   // Light: Cinza muito escuro
        },
        'text-secondary': {
          DEFAULT: '#AEB6C2', // Dark: Cinza claro
          light: '#475569',   // Light: Cinza médio
        },
        'text-disabled': {
          DEFAULT: '#7A8491', // Dark: Cinza opaco
          light: '#94A3B8',   // Light: Cinza claro
        },
        
        // Status colors
        success: {
          DEFAULT: '#22C55E',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#F2B705',
          foreground: '#000000',
        },
        error: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        info: {
          DEFAULT: '#00C2D1',
          foreground: '#FFFFFF',
        },
        
        // Shadcn required colors
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
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
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
