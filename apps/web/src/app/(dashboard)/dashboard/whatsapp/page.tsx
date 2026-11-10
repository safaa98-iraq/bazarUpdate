'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { canUseFeature, type Plan } from '@/lib/plan-features';
import { ClayIcon } from '@/components/ui/ClayIcon';
import { UpgradeNotice } from '@/components/dashboard/UpgradeNotice';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

type WA = { autoConfirm: boolean; message: string; phoneNumberId: string; templateName: string; templateLang: string; hasAccessToken: boolean; apiConfigured: boolean };

const PREVIEW_VARS = { name: 'زينب', store: 'متجري', total: '45,000 د.ع', order: 'X7K2P9', link: 'https://bazar.iq/store/…/confirm/…' };

export default function WhatsappPage() {
  useDocumentTitle('تأكيد الطلبات عبر واتساب');
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const allowed = canUseFeature(plan, 'whatsapp_confirm');
  const [wa, setWa] = useState<WA | null>(null);
  const [token, setToken] = useState('');
  const [canEditCreds, setCanEditCreds] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ data: { whatsapp: WA; canEditCredentials: boolean } }>('/api/stores/my/features')
      .then(r => { setWa(r.data.whatsapp); setCanEditCreds(r.data.canEditCredentials); }).catch(e => toast.error(e.message));
  }, []);

  const save = async () => {
    if (!wa) return;
    setSaving(true);
    try {
      const r = await api.put<{ data: WA }>('/api/stores/my/features/whatsapp', { ...wa, accessToken: token });
      setWa(r.data); setToken(''); toast.success('تم الحفظ');
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const preview = (wa?.message ?? '').replace(/\{(\w+)\}/g, (m, k: keyof typeof PREVIEW_VARS) => PREVIEW_VARS[k] ?? m);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-5xl">
      <div className="mb-6">
        <h1 className="bz-large-title">تأكيد الطلبات عبر واتساب</h1>
        <p className="text-sm text-bz-muted mt-1">قبل الشحن يصل الزبون رابط فيه زرّان: «أؤكد الطلب» أو «ألغِ الطلب». تشحن فقط الطلبات المؤكَّدة وتوفّر كلفة التوصيل الفاشل.</p>
      </div>

      {!allowed && <UpgradeNotice feature="whatsapp_confirm" />}

      {allowed && wa && (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <section className="bz-card p-5">
              <h2 className="bz-headline mb-1">نص الرسالة</h2>
              <p className="text-xs text-bz-muted mb-3">المتغيرات: <code>{'{name}'}</code> اسم الزبون، <code>{'{store}'}</code> المتجر، <code>{'{total}'}</code> المبلغ، <code>{'{order}'}</code> رقم الطلب، <code>{'{link}'}</code> رابط التأكيد (إلزامي)</p>
              <textarea rows={6} className="w-full p-3 border border-bz-line text-sm leading-7" value={wa.message} onChange={e => setWa({ ...wa, message: e.target.value })} />
            </section>

            <section className="bz-card p-5">
              <h2 className="bz-headline mb-1">طريقة الإرسال</h2>
              <div className="rounded-2xl bg-bz-bg p-4 mb-4 text-sm leading-7">
                <p className="font-semibold">١. يدوياً (يعمل الآن بدون أي إعداد)</p>
                <p className="text-bz-muted">من صفحة الطلب اضغط «اطلب التأكيد على واتساب» — يفتح واتساب برسالة جاهزة للزبون، فقط اضغط إرسال.</p>
                <p className="font-semibold mt-3">٢. تلقائياً عبر WhatsApp Business API</p>
                <p className="text-bz-muted">تُرسل الرسالة لحظة وصول الطلب بدون أي تدخل. تحتاج حساب Meta Business ورقماً مفعّلاً وقالب رسالة معتمداً.</p>
              </div>
              {!canUseFeature(plan, 'whatsapp_api') ? (
                <div className="rounded-xl border border-dashed border-bz-line p-4 text-sm flex items-center gap-3">
                  <span className="bz-chip bg-bz-bg text-bz-muted">🔒 الأعمال</span>
                  <span className="flex-1 text-bz-muted">الإرسال التلقائي عبر WhatsApp Business API متاح في باقة الأعمال. في باقتك تؤكد الطلبات يدوياً بضغطة.</span>
                  <a href="/dashboard/upgrade" className="text-bz-brand-600 font-bold whitespace-nowrap">الترقية</a>
                </div>
              ) : canEditCreds ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  <input dir="ltr" placeholder="Phone Number ID" className="h-10 px-3 border border-bz-line text-sm" value={wa.phoneNumberId} onChange={e => setWa({ ...wa, phoneNumberId: e.target.value })} />
                  <input dir="ltr" type="password" placeholder={wa.hasAccessToken ? '•••••• Access token (محفوظ)' : 'Access token'} className="h-10 px-3 border border-bz-line text-sm" value={token} onChange={e => setToken(e.target.value)} />
                  <input dir="ltr" placeholder="Template name (مثال: order_confirmation)" className="h-10 px-3 border border-bz-line text-sm" value={wa.templateName} onChange={e => setWa({ ...wa, templateName: e.target.value })} />
                  <input dir="ltr" placeholder="Template language (ar)" className="h-10 px-3 border border-bz-line text-sm" value={wa.templateLang} onChange={e => setWa({ ...wa, templateLang: e.target.value })} />
                  <p className="sm:col-span-2 text-[11px] text-bz-muted">القالب: نص بثلاث متغيرات (الاسم، المتجر، المبلغ) وزر رابط ينتهي بـ <code dir="ltr">/confirm/{'{{1}}'}</code>.</p>
                </div>
              ) : <p className="text-xs text-bz-muted">بيانات الربط يعدّلها صاحب المتجر فقط.</p>}
              {canUseFeature(plan, 'whatsapp_api') && <label className="flex items-center gap-3 mt-4 rounded-xl border border-bz-line p-3 cursor-pointer">
                <input type="checkbox" checked={wa.autoConfirm} onChange={e => setWa({ ...wa, autoConfirm: e.target.checked })} />
                <span className="text-sm"><span className="font-semibold">أرسل التأكيد تلقائياً لكل طلب جديد</span>{!wa.apiConfigured && <span className="block text-xs text-[#B45309]">يتطلب ربط WhatsApp Business API أولاً</span>}</span>
              </label>}
              {wa.apiConfigured && canUseFeature(plan, 'whatsapp_api') && <p className="text-xs text-[#17845C] mt-2 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> الربط مفعّل</p>}
            </section>

            <button onClick={save} disabled={saving} className="bz-btn"><Save className="h-4 w-4" /> {saving ? 'جارٍ الحفظ…' : 'حفظ'}</button>
          </div>

          <aside className="lg:col-span-2">
            <p className="text-sm font-semibold mb-2">معاينة الرسالة</p>
            <div className="rounded-3xl p-4 bg-[#E7DDD3]" style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,.04) 1px, transparent 1px)', backgroundSize: '12px 12px' }}>
              <div className="bg-[#D9FDD3] rounded-2xl rounded-tl-sm p-3 text-sm leading-7 whitespace-pre-wrap shadow-sm max-w-[92%] mr-auto">{preview}</div>
            </div>
            <div className="bz-card p-4 mt-4 flex items-center gap-3">
              <ClayIcon name="shield-check" size={44} />
              <p className="text-xs text-bz-muted leading-6">عند الإلغاء يرجع المخزون تلقائياً، وتصلك إشعارات بكل تأكيد أو إلغاء. في صفحة الطلبات استخدم فلتر «أكّدها الزبون» قبل الشحن.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
