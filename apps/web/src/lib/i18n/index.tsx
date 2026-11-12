'use client';

/**
 * Client-side translation: `const t = useT(); t('نص عربي')` returns the text in the visitor's language.
 * Placeholders: t('وفّر {0}', ['$101']).
 */
import { createContext, useCallback, useContext, useEffect } from 'react';
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

const ATTRS = ['placeholder', 'title', 'aria-label'];

/**
 * Safety net for app screens (dashboard / admin): translates any Arabic text node or attribute that
 * reached the page without going through t() (module-level labels, server messages with a known text).
 * Exact dictionary matches only; does nothing in Arabic.
 */
export function DomTranslator() {
  const locale = useLocale();
  useEffect(() => {
    if (locale === 'ar') return;
    const dict = DICTS[locale];
    const tr = (s: string | null) => {
      if (!s) return null;
      const key = s.trim();
      if (!key || !/[؀-ۿ]/.test(key)) return null;
      const hit = dict[key];
      return hit && hit !== key ? s.replace(key, hit) : null;
    };
    const walk = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) { const v = tr(root.nodeValue); if (v) root.nodeValue = v; return; }
      if (!(root instanceof Element)) return;
      if (root.closest('[data-no-translate],script,style,textarea,[contenteditable="true"]')) return;
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n = w.nextNode();
      while (n) {
        if (!n.parentElement?.closest('[data-no-translate],script,style,textarea,[contenteditable="true"]')) { const v = tr(n.nodeValue); if (v) n.nodeValue = v; }
        n = w.nextNode();
      }
      for (const el of [root, ...Array.from(root.querySelectorAll(ATTRS.map(a => `[${a}]`).join(',')))]) {
        for (const a of ATTRS) { const v = tr(el.getAttribute(a)); if (v) el.setAttribute(a, v); }
      }
    };
    walk(document.body);
    const obs = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'characterData') walk(m.target);
        else if (m.type === 'attributes' && m.target instanceof Element && m.attributeName) {
          const v = tr(m.target.getAttribute(m.attributeName)); if (v) m.target.setAttribute(m.attributeName, v);
        } else m.addedNodes.forEach(walk);
      }
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    return () => obs.disconnect();
  }, [locale]);
  return null;
}
