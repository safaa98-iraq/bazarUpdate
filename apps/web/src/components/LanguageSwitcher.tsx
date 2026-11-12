'use client';

import { Globe } from 'lucide-react';
import { LOCALES, LOCALE_LABELS, setLocaleCookie, useLocale, type Locale } from '@/lib/i18n';

/** Language picker for the public website (Arabic / English / Kurdish). */
export function LanguageSwitcher({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const locale = useLocale();
  return (
    <label className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      <Globe className="h-4 w-4 opacity-70" aria-hidden />
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={e => setLocaleCookie(e.target.value as Locale)}
        className="bg-transparent font-semibold outline-none cursor-pointer"
        aria-label="Language / اللغة / زمان"
      >
        {LOCALES.map(l => <option key={l} value={l}>{compact ? l.toUpperCase() : LOCALE_LABELS[l]}</option>)}
      </select>
    </label>
  );
}
