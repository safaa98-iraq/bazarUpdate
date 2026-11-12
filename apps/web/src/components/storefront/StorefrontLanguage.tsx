'use client';

import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { translate, storageKey, storeDir, STORE_LANG_LABELS, type StoreLang } from '@/lib/storefront-i18n';

const ATTRS = ['placeholder', 'title', 'aria-label'];

/** Translate the storefront UI in place (text nodes + a few attributes), and keep doing it as React re-renders. */
function translateTree(root: Node, lang: StoreLang) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('[data-no-translate],script,style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  let node = walker.nextNode();
  while (node) {
    const next = translate(node.nodeValue ?? '', lang);
    if (next !== node.nodeValue) node.nodeValue = next;
    node = walker.nextNode();
  }
  if (root instanceof Element) {
    const els = [root, ...Array.from(root.querySelectorAll(ATTRS.map(a => `[${a}]`).join(',')))];
    for (const el of els) {
      for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (v) { const t = translate(v, lang); if (t !== v) el.setAttribute(a, t); }
      }
    }
  }
}

export function StorefrontLanguage({ slug, languages }: { slug: string; languages: StoreLang[] }) {
  const [lang, setLang] = useState<StoreLang>(languages[0] ?? 'ar');

  // Pick the language: ?lang= → saved choice → store default
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('lang') as StoreLang | null;
    let saved: StoreLang | null = null;
    try { saved = localStorage.getItem(storageKey(slug)) as StoreLang | null; } catch { /* storage blocked */ }
    const chosen = [fromUrl, saved].find((l): l is StoreLang => !!l && languages.includes(l)) ?? languages[0] ?? 'ar';
    setLang(chosen);
  }, [slug, languages]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = storeDir(lang);
    if (lang === 'ar') return;
    translateTree(document.body, lang);
    document.title = translate(document.title, lang);
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
          const t = translate(m.target.nodeValue ?? '', lang);
          if (t !== m.target.nodeValue) m.target.nodeValue = t;
        } else if (m.type === 'attributes' && m.target instanceof Element && m.attributeName) {
          const v = m.target.getAttribute(m.attributeName);
          if (v) { const t = translate(v, lang); if (t !== v) m.target.setAttribute(m.attributeName, t); }
        } else {
          m.addedNodes.forEach(n => translateTree(n, lang));
        }
      }
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    return () => obs.disconnect();
  }, [lang]);

  if (languages.length < 2) return null;

  const switchTo = (l: StoreLang) => {
    try { localStorage.setItem(storageKey(slug), l); } catch { /* ignore */ }
    // Arabic is the source text, so going back to it is a clean reload.
    if (l === 'ar' || lang !== 'ar') window.location.reload();
    else setLang(l);
  };

  return (
    <div data-no-translate className="fixed bottom-5 right-4 z-[60] print:hidden">
      <div className="flex items-center gap-1 rounded-full bg-white/90 backdrop-blur border border-black/10 shadow-sm p-1 text-xs font-semibold">
        <Globe className="h-3.5 w-3.5 mx-1 text-gray-500" />
        {languages.map(l => (
          <button key={l} onClick={() => l !== lang && switchTo(l)}
            className={`px-2.5 py-1 rounded-full transition ${l === lang ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {STORE_LANG_LABELS[l]}
          </button>
        ))}
      </div>
    </div>
  );
}
