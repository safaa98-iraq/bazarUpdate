/**
 * Website languages. Arabic is the source language: every UI string is written in Arabic in the code
 * and looked up in the English / Kurdish (Sorani) dictionaries at render time.
 * Safe to import from middleware (no React).
 */
export type Locale = 'ar' | 'en' | 'ckb';
export const LOCALES: Locale[] = ['ar', 'en', 'ckb'];
export const DEFAULT_LOCALE: Locale = 'ar';
export const LOCALE_COOKIE = 'bz_locale';
export const LOCALE_LABELS: Record<Locale, string> = { ar: 'العربية', en: 'English', ckb: 'کوردی' };

export const isLocale = (v: unknown): v is Locale => v === 'ar' || v === 'en' || v === 'ckb';
export const dirOf = (l: Locale): 'rtl' | 'ltr' => (l === 'en' ? 'ltr' : 'rtl');

/** Arabic-speaking countries (ISO 3166-1 alpha-2). */
const ARABIC_COUNTRIES = new Set([
  'IQ', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'YE', 'JO', 'SY', 'LB', 'PS', 'EG', 'LY', 'TN', 'DZ', 'MA', 'SD', 'MR', 'SO', 'DJ', 'KM',
]);
/** Kurdistan Region of Iraq: ISO 3166-2 subdivision codes (Erbil, Sulaymaniyah, Duhok, Halabja, region code). */
const KRG_REGIONS = new Set(['AR', 'SU', 'DA', 'KR', 'HA', 'IQ-AR', 'IQ-SU', 'IQ-DA', 'IQ-KR', 'IQ-HA']);
const KRG_CITIES = /^(erbil|arbil|hewl[eê]r|sulaymaniyah|sulaimani|slemani|silêmanî|duhok|dohuk|dihok|halabja|zakho|soran|ranya|koya|akre|kalar)/i;

type HeaderGetter = { get(name: string): string | null };

/**
 * Pick the language for a first-time visitor:
 *  1. location from the hosting/CDN geo headers (Cloudflare, Vercel, CloudFront…):
 *     Kurdistan Region → Kurdish, Iraq and Arab countries → Arabic, anywhere else → English;
 *  2. otherwise the browser language (Accept-Language);
 *  3. otherwise Arabic.
 */
export function detectLocale(h: HeaderGetter): Locale {
  const country = (h.get('cf-ipcountry') ?? h.get('x-vercel-ip-country') ?? h.get('cloudfront-viewer-country') ?? h.get('x-country-code') ?? '').toUpperCase();
  const region = (h.get('cf-region-code') ?? h.get('x-vercel-ip-country-region') ?? h.get('cloudfront-viewer-country-region') ?? h.get('x-region-code') ?? '').toUpperCase();
  const city = decodeURIComponent(h.get('cf-ipcity') ?? h.get('x-vercel-ip-city') ?? h.get('cloudfront-viewer-city') ?? '');
  const accept = (h.get('accept-language') ?? '').toLowerCase();
  const prefersKurdish = /(^|,)\s*(ckb|ku)\b/.test(accept);

  if (country && country !== 'XX' && country !== 'T1') {
    if (country === 'IQ') {
      if (KRG_REGIONS.has(region) || KRG_CITIES.test(city) || prefersKurdish) return 'ckb';
      return 'ar';
    }
    if (ARABIC_COUNTRIES.has(country)) return 'ar';
    return prefersKurdish ? 'ckb' : 'en';
  }

  // No location available (e.g. no CDN in front yet): use the browser's preferred language.
  const first = accept.split(',').map(s => s.split(';')[0].trim()).find(Boolean) ?? '';
  if (first.startsWith('ckb') || first.startsWith('ku')) return 'ckb';
  if (first.startsWith('ar')) return 'ar';
  if (first) return prefersKurdish ? 'ckb' : 'en';
  return DEFAULT_LOCALE;
}

/** The visitor's saved language, read from the cookie in the browser ('ar' on the server). */
export function currentLocale(): Locale {
  if (typeof document === 'undefined') return 'ar';
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  return m && isLocale(m[1]) ? m[1] : 'ar';
}

/** Intl locale for dates and numbers in app screens. */
export function intlLocale(locale: Locale = currentLocale()): string {
  return locale === 'en' ? 'en-US' : locale === 'ckb' ? 'ckb-IQ' : 'ar-IQ';
}
