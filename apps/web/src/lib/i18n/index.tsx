'use client';

/**
 * Client-side translation: `const t = useT(); t('نص عربي')` returns the text in the visitor's language.
 * Placeholders: t('وفّر {0}', ['$101']).
 */
import { createContext, useCallback, useContext } from 'react';
import { dirOf, LOCALE_COOKIE, type Locale } from './locales';
import { EN } from './dict-en';
import { CKB } from './dict-ckb';

export * from './locales';

const DICTS: Record<Exclude<Locale, 'ar'>, Record<string, string>> = { en: EN, ckb: CKB };

export function translate(locale: Locale, text: string, vars?: (string | number | null | undefined)[]): string {
  let out = locale === 'ar' ? text : (DICTS[locale][text] ?? DICTS[locale][text.trim()] ?? text);
  if (vars) vars.forEach((v, i) => { out = out.split(`{${i}}`).join(v == null ? '' : String(v)); });
  return out;
}

const LocaleContext = createContext<Locale>('ar');

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);

export function useT() {
  const locale = useLocale();
  return useCallback((text: string, vars?: (string | number | null | undefined)[]) => translate(locale, text, vars), [locale]);
}

/** Wraps a translated page/section with the right direction and lang attribute. */
export function LocaleRoot({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const locale = useLocale();
  return <div dir={dirOf(locale)} lang={locale} className={className} style={style}>{children}</div>;
}

/** Persist a language choice and reload the page in it. */
export function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.location.reload();
}
