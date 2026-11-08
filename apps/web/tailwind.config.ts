import type { Config } from 'tailwindcss';

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
        // Cool, slightly blue-tinted neutrals
        gray: {
          50: '#F6F8FA', 100: '#EEF2F6', 200: '#E6ECF1', 300: '#D3DCE4', 400: '#A3B0BC',
          500: '#7A8A99', 600: '#5B6B7B', 700: '#3E5163', 800: '#1E3A52', 900: '#0B3550', 950: '#061F31',
        },
        bz: {
          brand: '#20A9F4', 'brand-600': '#0E8AD6', 'brand-300': '#7CCFFA', 'brand-100': '#E3F5FE', 'brand-50': '#F1FAFF',
          ink: '#0B3550', 'ink-2': '#32506A', bg: '#F6F8FA', line: '#E6ECF1', muted: '#7A8A99',
          green: '#22B07D', red: '#F04F4F', orange: '#F59E0B', yellow: '#FBBF24', purple: '#8B5CF6',
          // legacy names still used by some components
          blue: '#20A9F4', fill: '#EEF2F6', label: '#0B3550', separator: '#E6ECF1', gray: '#7A8A99',
          indigo: '#6366F1', pink: '#EC4899', teal: '#14B8A6',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
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
        sm: '8px',
        md: '10px',
        lg: 'var(--radius)',
        xl: '14px',
        '2xl': '16px',
        '3xl': '24px',
      },
      fontFamily: {
        sans: ['var(--font-tajawal)'],
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};

export default config;
