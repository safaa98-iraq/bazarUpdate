import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { currentLocale, intlLocale } from './i18n/locales';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  // Dashboard / admin follow the platform language; storefronts keep Arabic numerals (they have their own language switch).
  const appScreen = typeof window !== 'undefined' && /^\/(dashboard|admin)(\/|$)/.test(window.location.pathname);
  const locale = appScreen ? currentLocale() : 'ar';
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + (locale === 'en' ? ' IQD' : ' د.ع');
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
