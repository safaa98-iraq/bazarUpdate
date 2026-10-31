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
        // iOS neutral grays (systemGray…systemGray6) instead of Tailwind's blue-tinted grays
        gray: {
          50: '#F9F9FB', 100: '#F2F2F7', 200: '#E5E5EA', 300: '#D1D1D6', 400: '#AEAEB2',
          500: '#8E8E93', 600: '#636366', 700: '#48484A', 800: '#2C2C2E', 900: '#1C1C1E', 950: '#000000',
        },
        ios: {
          blue: '#007AFF', indigo: '#5856D6', purple: '#AF52DE', pink: '#FF2D55', red: '#FF3B30',
          orange: '#FF9500', yellow: '#FFCC00', green: '#34C759', teal: '#30B0C7', gray: '#8E8E93',
          bg: '#F2F2F7', fill: 'rgba(120,120,128,0.12)', label: '#1C1C1E', separator: 'rgba(60,60,67,0.18)',
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
        '2xl': '18px',
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
