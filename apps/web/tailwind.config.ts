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
        // Warm, paper-toned grays for the raw/brutalist palette
        gray: {
          50: '#F7F3EB', 100: '#F1ECE2', 200: '#E8E1D3', 300: '#BDB4A3', 400: '#8A8478',
          500: '#5C574F', 600: '#4A463F', 700: '#2A2A2A', 800: '#1A1A1A', 900: '#0A0A0A', 950: '#000000',
        },
        b: {
          ink: '#0A0A0A', paper: '#F1ECE2', paper2: '#E8E1D3', blue: '#2342FF', yellow: '#FFD400',
          orange: '#FF6B00', red: '#FF2E1F', green: '#00A651', pink: '#FF3D8B', purple: '#9B3DFF',
          teal: '#00A3A3', muted: '#5C574F',
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
        sm: '0px', md: '0px', lg: '0px', xl: '0px', '2xl': '0px', '3xl': '0px',
      },
      boxShadow: {
        brut: '4px 4px 0 #0A0A0A',
        'brut-sm': '2px 2px 0 #0A0A0A',
        'brut-lg': '8px 8px 0 #0A0A0A',
      },
      fontFamily: {
        sans: ['var(--font-tajawal)'],
        mono: ['var(--font-mono)'],
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
