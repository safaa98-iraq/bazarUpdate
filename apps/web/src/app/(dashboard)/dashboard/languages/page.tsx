'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { canUseFeature, type Plan } from '@/lib/plan-features';
import { UpgradeNotice } from '@/components/dashboard/UpgradeNotice';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const OPTIONS = [
  { key: 'ar', label: 'العربية', sample: 'أضف إلى السلة', locked: true },
  { key: 'en', label: 'الإنكليزية (English)', sample: 'Add to cart', locked: false },
  { key: 'ckb', label: 'الكردية (سۆرانی)', sample: 'زیادکردن بۆ سەبەتە', locked: false },
];

export default function LanguagesPage() {
  useDocumentTitle('لغات المتجر');
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const allowed = canUseFeature(plan, 'languages');
  const [langs, setLangs] = useState<string[]>(['ar']);
  const [slug, setSlug] = useState('');

  useEffect(() => {
    api.get<{ data: { languages: string[]; slug: string } }>('/api/stores/my/features').then(r => { setLangs(r.data.languages); setSlug(r.data.slug); }).catch(() => null);
  }, []);

  const toggle = async (key: string) => {
    const next = langs.includes(key) ? langs.filter(l => l !== key) : [...langs, key];
    try { const r = await api.put<{ data: string[] }>('/api/stores/my/features/languages', { languages: next }); setLangs(r.data); toast.success('تم الحفظ'); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-3xl">
      <h1 className="bz-large-title">لغات المتجر</h1>
      <p className="text-sm text-bz-muted mt-1 mb-6">فعّل الإنكليزية أو الكردية ليظهر لزبائنك زر تبديل اللغة في متجرك. تُترجم واجهة المتجر (الأزرار، السلة، الدفع، التتبع)، أما أسماء منتجاتك ووصفها فتبقى كما كتبتها.</p>
      {!allowed && <UpgradeNotice feature="languages" />}
      {allowed && (
        <div className="space-y-3">
          {OPTIONS.map(o => (
            <label key={o.key} className={`bz-card p-5 flex items-center gap-4 ${o.locked ? '' : 'cursor-pointer'}`}>
              <input type="checkbox" disabled={o.locked} checked={langs.includes(o.key)} onChange={() => toggle(o.key)} />
              <div className="flex-1">
                <p className="font-bold">{o.label} {o.locked && <span className="bz-chip bg-bz-bg text-bz-muted mr-1">الأساسية</span>}</p>
                <p className="text-sm text-bz-muted mt-0.5">مثال: «{o.sample}»</p>
              </div>
            </label>
          ))}
          <div className="flex flex-wrap gap-2">
            {slug && langs.includes('en') && (
              <a href={`/store/${slug}?lang=en`} target="_blank" className="bz-btn bz-btn-outline mt-2"><ExternalLink className="h-4 w-4" /> معاينة المتجر بالإنكليزية</a>
            )}
            {slug && langs.includes('ckb') && (
              <a href={`/store/${slug}?lang=ckb`} target="_blank" className="bz-btn bz-btn-outline mt-2"><ExternalLink className="h-4 w-4" /> معاينة المتجر بالكردية</a>
            )}
          </div>
          <p className="text-xs text-bz-muted mt-4">💡 الترجمة الكردية أولية — راجعها مع متحدث كردي، وأرسل لنا أي تعديل.</p>
        </div>
      )}
    </div>
  );
}
