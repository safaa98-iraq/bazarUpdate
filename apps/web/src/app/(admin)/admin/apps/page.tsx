'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Save, ExternalLink, Search, Upload, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

type Status = 'NONE' | 'REQUESTED' | 'IN_PROGRESS' | 'READY';
type App = {
  status: Status; requestedAt: string | null; enabled: boolean; appName: string; shortName: string; icon: string | null;
  themeColor: string; installPrompt: boolean; showOnStore: boolean; adminNote: string | null;
  builds: { android: Build; ios: Build };
};
type Build = { fileName: string; version: string; size: number; uploadedAt: string; bundleId?: string | null } | null;
type Row = { storeId: string; storeName: string; slug: string; logo: string | null; merchant: { name: string; email: string; plan: string }; app: App };

const STATUS: Record<Status, { label: string; cls: string }> = {
  REQUESTED: { label: 'طلب جديد', cls: 'bg-amber-100 text-amber-700' },
  IN_PROGRESS: { label: 'قيد التجهيز', cls: 'bg-bz-brand-50 text-bz-brand-600' },
  READY: { label: 'جاهز', cls: 'bg-green-100 text-green-700' },
  NONE: { label: 'لم يُطلب', cls: 'bg-bz-bg text-bz-muted' },
};

const input = 'w-full h-10 px-3 rounded-xl border border-bz-line text-sm bg-white';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

/** Upload an APK / IPA — the file is stored in Bazar's database and downloaded from there. */
function BuildUploader({ platform, row, onSaved }: { platform: 'android' | 'ios'; row: Row; onSaved: (r: Row) => void }) {
  const build = row.app.builds[platform];
  const ext = platform === 'android' ? '.apk' : '.ipa';
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState(build?.version ?? '1.0.0');
  const [bundleId, setBundleId] = useState(build?.bundleId ?? `iq.bazar.${row.slug.replace(/[^a-z0-9]/gi, '').toLowerCase()}`);
  const [progress, setProgress] = useState<number | null>(null);

  const upload = () => {
    if (!file) return;
    const token = localStorage.getItem('sb_token') ?? sessionStorage.getItem('sb_token') ?? '';
    const qs = new URLSearchParams({ fileName: file.name, version, ...(platform === 'ios' ? { bundleId } : {}) });
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `${API_URL}/api/admin/apps/${row.storeId}/builds/${platform}?${qs}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.upload.onprogress = e => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      let body: { data?: Row; error?: string } = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status < 300 && body.data) { onSaved(body.data); setFile(null); toast.success('تم رفع الملف وحفظه في قاعدة البيانات'); }
      else toast.error(body.error ?? (xhr.status === 413 ? 'الملف أكبر من 150MB' : 'فشل الرفع'));
    };
    xhr.onerror = () => { setProgress(null); toast.error('فشل الرفع'); };
    xhr.send(file);
  };
  const remove = async () => {
    if (!confirm('حذف ملف التطبيق؟')) return;
    try { const r = await api.delete<{ data: Row }>(`/api/admin/apps/${row.storeId}/builds/${platform}`); onSaved(r.data); toast.success('تم الحذف'); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="rounded-xl border border-bz-line bg-white p-4 space-y-2">
      <p className="text-sm font-semibold">{platform === 'android' ? 'ملف أندرويد (APK)' : 'ملف آيفون (IPA) — اختياري'}</p>
      {build ? (
        <div className="flex items-center gap-2 text-xs text-bz-muted">
          <span className="flex-1 truncate" dir="ltr">{build.fileName} · v{build.version} · {mb(build.size)}</span>
          <button onClick={remove} className="text-red-500" title="حذف"><Trash2 className="h-4 w-4" /></button>
        </div>
      ) : <p className="text-xs text-bz-muted">لم يُرفع ملف بعد.</p>}
      <input type="file" accept={ext} onChange={e => setFile(e.target.files?.[0] ?? null)} className="block w-full text-xs" />
      <div className="flex gap-2">
        <input dir="ltr" value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0.0" className={`${input} !h-9 !w-24 flex-none`} title="رقم الإصدار" />
        {platform === 'ios' && <input dir="ltr" value={bundleId} onChange={e => setBundleId(e.target.value)} placeholder="Bundle ID" className={`${input} !h-9 min-w-0 flex-1`} />}
        <button onClick={upload} disabled={!file || progress !== null} className="bz-btn h-9 text-sm">
          {progress !== null ? <><Loader2 className="h-4 w-4 animate-spin" /> {progress}%</> : <><Upload className="h-4 w-4" /> رفع</>}
        </button>
      </div>
      {platform === 'ios' && <p className="text-[11px] text-bz-muted leading-5">التثبيت المباشر على الآيفون يتطلب IPA موقّعاً بشهادة Apple (Enterprise أو Ad-hoc). بدونه يحصل زبائن الآيفون على نسخة الويب.</p>}
    </div>
  );
}

function AppEditor({ row, onSaved }: { row: Row; onSaved: (r: Row) => void }) {
  const [f, setF] = useState<App>(row.app);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof App>(k: K, v: App[K]) => setF(p => ({ ...p, [k]: v }));
  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put<{ data: Row }>(`/api/admin/apps/${row.storeId}`, {
        appName: f.appName, shortName: f.shortName, icon: f.icon ?? '', themeColor: f.themeColor,
        status: f.status === 'NONE' ? 'IN_PROGRESS' : f.status,
        enabled: f.enabled, installPrompt: f.installPrompt, adminNote: f.adminNote ?? '',
      });
      onSaved(r.data); setF(r.data.app); toast.success('تم حفظ التطبيق');
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };
  return (
    <div className="border-t border-bz-line p-5 grid md:grid-cols-2 gap-4 bg-bz-bg/50">
      <label className="text-sm font-semibold">اسم التطبيق<input maxLength={45} className={`${input} mt-1`} value={f.appName} onChange={e => set('appName', e.target.value)} /></label>
      <label className="text-sm font-semibold">الاسم تحت الأيقونة (12 حرفاً)<input maxLength={12} className={`${input} mt-1`} value={f.shortName} onChange={e => set('shortName', e.target.value)} /></label>
      <label className="text-sm font-semibold">رابط الأيقونة (512×512)<input dir="ltr" placeholder="شعار المتجر افتراضياً" className={`${input} mt-1`} value={f.icon ?? ''} onChange={e => set('icon', e.target.value)} /></label>
      <label className="text-sm font-semibold">لون التطبيق<input type="color" className="block h-10 w-20 mt-1 rounded-lg border border-bz-line" value={f.themeColor} onChange={e => set('themeColor', e.target.value)} /></label>
      <BuildUploader platform="android" row={row} onSaved={r => { onSaved(r); setF(p => ({ ...p, builds: r.app.builds, status: r.app.status })); }} />
      <BuildUploader platform="ios" row={row} onSaved={r => { onSaved(r); setF(p => ({ ...p, builds: r.app.builds, status: r.app.status })); }} />
      <label className="text-sm font-semibold">الحالة
        <select className={`${input} mt-1`} value={f.status === 'NONE' ? 'IN_PROGRESS' : f.status} onChange={e => set('status', e.target.value as Status)}>
          <option value="REQUESTED">طلب جديد</option>
          <option value="IN_PROGRESS">قيد التجهيز</option>
          <option value="READY">جاهز (تظهر أزرار التحميل للتاجر)</option>
        </select>
      </label>
      <label className="text-sm font-semibold">ملاحظة داخلية<input className={`${input} mt-1`} value={f.adminNote ?? ''} onChange={e => set('adminNote', e.target.value)} /></label>
      <div className="md:col-span-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.enabled} onChange={e => set('enabled', e.target.checked)} /> تفعيل نسخة الويب القابلة للتثبيت (PWA — تُستخدم للآيفون إن لم يُرفع IPA)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.installPrompt} onChange={e => set('installPrompt', e.target.checked)} /> بطاقة «ثبّت التطبيق» داخل المتجر</label>
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <button onClick={save} disabled={saving} className="bz-btn">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ التطبيق</button>
        <span className="text-xs text-bz-muted">التاجر يقرر فقط إظهار الرابط في متجره: {row.app.showOnStore ? 'ظاهر ✓' : 'غير ظاهر'}</span>
      </div>
    </div>
  );
}

export default function AdminAppsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Status | 'ALL'>('ALL');

  const load = useCallback(() => {
    api.get<{ data: Row[] }>('/api/admin/apps').then(r => setRows(r.data)).catch(e => { toast.error((e as Error).message); setRows([]); });
  }, []);
  useEffect(load, [load]);

  const list = (rows ?? []).filter(r => (filter === 'ALL' || r.app.status === filter) && (!q || `${r.storeName} ${r.slug} ${r.merchant.name} ${r.merchant.email}`.toLowerCase().includes(q.toLowerCase())));
  const count = (s: Status) => (rows ?? []).filter(r => r.app.status === s).length;

  return (
    <div className="p-6 max-w-6xl" dir="rtl">
      <div className="flex items-center justify-between gap-4 mb-1">
        <h1 className="bz-large-title">تطبيقات المتاجر</h1>
        <button onClick={load} className="bz-btn bz-btn-outline h-10"><RefreshCw className="h-4 w-4" /> تحديث</button>
      </div>
      <p className="text-sm text-bz-muted mb-6">إنشاء ونشر تطبيقات أندرويد وآيفون لمتاجر باقة الأعمال. التجار يطلبون التطبيق فقط، والإنشاء والتعديل من هنا.</p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="bz-segmented max-w-full overflow-x-auto">
          {(['ALL', 'REQUESTED', 'IN_PROGRESS', 'READY', 'NONE'] as const).map(s => (
            <button key={s} data-active={filter === s} onClick={() => setFilter(s)} className={filter === s ? 'is-active' : ''}>
              {s === 'ALL' ? `الكل (${rows?.length ?? 0})` : `${STATUS[s].label} (${count(s)})`}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute top-3 start-3 text-bz-muted" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث بالمتجر أو التاجر" className={`${input} ps-9`} />
        </div>
      </div>

      {!rows ? <Loader2 className="h-6 w-6 animate-spin text-bz-brand mx-auto mt-10" /> : !list.length ? (
        <p className="bz-card p-10 text-center text-bz-muted">لا توجد متاجر في باقة الأعمال بهذا الفلتر.</p>
      ) : (
        <div className="space-y-3">
          {list.map(r => (
            <div key={r.storeId} className="bz-card overflow-hidden">
              <div className="p-4 flex flex-wrap items-center gap-4">
                {r.logo ? <img src={r.logo} alt="" className="h-11 w-11 rounded-xl object-cover bg-bz-bg" /> : <div className="h-11 w-11 rounded-xl" style={{ background: r.app.themeColor }} />}
                <div className="flex-1 min-w-[160px]">
                  <p className="font-bold">{r.storeName} <a href={`/store/${r.slug}`} target="_blank" className="inline-block align-middle text-bz-muted"><ExternalLink className="h-3.5 w-3.5" /></a></p>
                  <p className="text-xs text-bz-muted">{r.merchant.name} · <span dir="ltr">{r.merchant.email}</span></p>
                </div>
                <span className={`bz-chip ${STATUS[r.app.status].cls}`}>{STATUS[r.app.status].label}</span>
                {r.app.requestedAt && <span className="text-xs text-bz-muted">طُلب {new Date(r.app.requestedAt).toLocaleDateString('ar-IQ')}</span>}
                <button onClick={() => setOpen(open === r.storeId ? null : r.storeId)} className={`bz-btn h-9 text-sm ${r.app.status === 'NONE' ? 'bz-btn-outline' : ''}`}>
                  {r.app.status === 'NONE' ? 'إنشاء تطبيق' : open === r.storeId ? 'إغلاق' : 'إدارة التطبيق'}
                </button>
              </div>
              {open === r.storeId && <AppEditor row={r} onSaved={nr => setRows(rs => (rs ?? []).map(x => x.storeId === nr.storeId ? nr : x))} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
