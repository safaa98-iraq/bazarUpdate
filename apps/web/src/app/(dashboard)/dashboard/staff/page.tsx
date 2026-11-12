'use client';

import { intlLocale, useT } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, X, Power } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { canUseFeature, type Plan } from '@/lib/plan-features';
import { ClayIcon } from '@/components/ui/ClayIcon';
import { UpgradeNotice } from '@/components/dashboard/UpgradeNotice';
import {
  STAFF_PERMISSIONS, STAFF_ROLE_PRESETS,
  type StaffMemberPublic, type StaffPermission, type StaffRolePreset, type WarehousePublic,
} from '@storebuilder/types';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

type Form = {
  id?: string; name: string; email: string; password: string;
  role: StaffRolePreset; permissions: StaffPermission[]; warehouseId: string;
};
const EMPTY: Form = { name: '', email: '', password: '', role: 'orders', permissions: STAFF_ROLE_PRESETS.orders.permissions, warehouseId: '' };

export default function StaffPage() {
  const t = useT();
  useDocumentTitle(t("الموظفون"));
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const allowed = canUseFeature(plan, 'staff');
  const [staff, setStaff] = useState<StaffMemberPublic[]>([]);
  const [branches, setBranches] = useState<WarehousePublic[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => Promise.all([
    api.get<{ data: StaffMemberPublic[] }>('/api/staff').then(r => setStaff(r.data)),
    api.get<{ data: WarehousePublic[] }>('/api/warehouses').then(r => setBranches(r.data)).catch(() => null),
  ]).catch(e => toast.error(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const pickRole = (role: StaffRolePreset) =>
    setForm(f => f && ({ ...f, role, permissions: role === 'custom' ? f.permissions : STAFF_ROLE_PRESETS[role].permissions }));
  const togglePerm = (p: StaffPermission) =>
    setForm(f => f && ({ ...f, role: 'custom', permissions: f.permissions.includes(p) ? f.permissions.filter(x => x !== p) : [...f.permissions, p] }));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const body = { name: form.name, email: form.email, role: form.role, permissions: form.permissions, warehouseId: form.warehouseId || null, ...(form.password ? { password: form.password } : {}) };
      if (form.id) await api.patch(`/api/staff/${form.id}`, body);
      else await api.post('/api/staff', { ...body, password: form.password });
      toast.success(form.id ? t("تم حفظ التعديلات") : t("تمت إضافة الموظف"));
      setForm(null); load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (m: StaffMemberPublic) => {
    try { await api.patch(`/api/staff/${m.id}`, { isActive: !m.isActive }); load(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const remove = async (m: StaffMemberPublic) => {
    if (!confirm(t("حذف حساب {0}؟", [m.name]))) return;
    try { await api.delete(`/api/staff/${m.id}`); load(); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="bz-large-title">{t("الموظفون")}</h1>
          <p className="text-sm text-bz-muted mt-1">{t("أعطِ كل موظف حساباً خاصاً بصلاحيات محددة — يدخل من صفحة الدخول باختيار «موظف في متجر».")}</p>
        </div>
        {allowed && <button onClick={() => setForm({ ...EMPTY })} className="bz-btn"><Plus className="h-4 w-4" /> {' '}{t("إضافة موظف")}</button>}
      </div>

      {!allowed && <UpgradeNotice feature="staff" />}

      {allowed && (loading ? (
        <div className="h-40 rounded-2xl bg-white border border-bz-line animate-pulse" />
      ) : staff.length === 0 ? (
        <div className="bz-card p-10 text-center">
          <ClayIcon name="users" size={80} className="mx-auto mb-4" />
          <p className="bz-headline">{t("لا يوجد موظفون بعد")}</p>
          <p className="text-sm text-bz-muted mt-1 mb-5">{t("أضف موظف طلبات، أو مسؤول فرع يرى طلبات فرعه فقط.")}</p>
          <button onClick={() => setForm({ ...EMPTY })} className="bz-btn">{t("إضافة أول موظف")}</button>
        </div>
      ) : (
        <div className="bz-card overflow-hidden">
          {staff.map((m, i) => (
            <div key={m.id} className={`flex flex-wrap items-center gap-4 px-5 py-4 ${i ? 'border-t border-bz-line' : ''} ${m.isActive ? '' : 'opacity-60'}`}>
              <span className="h-11 w-11 rounded-full bg-bz-brand-100 text-bz-brand-600 font-bold flex items-center justify-center">{m.name.charAt(0)}</span>
              <div className="flex-1 min-w-[180px]">
                <p className="font-bold text-bz-ink">{m.name} <span className="bz-chip bg-bz-bg text-bz-ink-2 mr-1">{STAFF_ROLE_PRESETS[m.role]?.label ?? m.role}</span></p>
                <p className="text-xs text-bz-muted mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>{m.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {m.permissions.map(p => <span key={p} className="bz-chip bg-bz-brand-50 text-bz-brand-600">{STAFF_PERMISSIONS.find(x => x.key === p)?.label}</span>)}
                  {m.warehouseName && <span className="bz-chip bg-[#FEF3E2] text-[#B45309]">📍 {m.warehouseName} {' '}{t("فقط")}</span>}
                </div>
              </div>
              <span className="text-xs text-bz-muted">{m.lastLoginAt ? t("آخر دخول {0}", [new Date(m.lastLoginAt).toLocaleDateString(intlLocale())]) : t("لم يدخل بعد")}</span>
              <div className="flex gap-1">
                <button title={m.isActive ? t("إيقاف") : t("تفعيل")} onClick={() => toggleActive(m)} className="h-9 w-9 rounded-full hover:bg-bz-bg flex items-center justify-center text-bz-muted"><Power className="h-4 w-4" /></button>
                <button title={t("تعديل")} onClick={() => setForm({ id: m.id, name: m.name, email: m.email, password: '', role: m.role, permissions: m.permissions, warehouseId: m.warehouseId ?? '' })} className="h-9 w-9 rounded-full hover:bg-bz-bg flex items-center justify-center text-bz-muted"><Pencil className="h-4 w-4" /></button>
                <button title={t("حذف")} onClick={() => remove(m)} className="h-9 w-9 rounded-full hover:bg-[#FDECEC] hover:text-bz-red flex items-center justify-center text-bz-muted"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setForm(null)} />
          <div className="relative bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="bz-title-2">{form.id ? t("تعديل موظف") : t("موظف جديد")}</h2>
              <button onClick={() => setForm(null)} className="h-9 w-9 rounded-full bg-bz-bg flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <Field label={t("الاسم")}><input className="w-full h-11 px-3 border border-bz-line" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label={t("البريد الإلكتروني (للدخول)")}><input dir="ltr" disabled={!!form.id} className="w-full h-11 px-3 border border-bz-line disabled:bg-bz-bg" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label={form.id ? t("كلمة مرور جديدة (اتركها فارغة للإبقاء)") : t("كلمة المرور")} hint={t("8 أحرف على الأقل، فيها حرف ورقم")}>
                <input dir="ltr" type="text" className="w-full h-11 px-3 border border-bz-line" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </Field>
              <Field label={t("الدور")}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(STAFF_ROLE_PRESETS) as StaffRolePreset[]).map(r => (
                    <button key={r} type="button" onClick={() => pickRole(r)}
                      className={`h-10 rounded-xl border text-sm font-semibold ${form.role === r ? 'border-bz-brand bg-bz-brand-50 text-bz-brand-600' : 'border-bz-line text-bz-ink-2'}`}>
                      {STAFF_ROLE_PRESETS[r].label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={t("الصلاحيات")}>
                <div className="space-y-2">
                  {STAFF_PERMISSIONS.map(p => (
                    <label key={p.key} className="flex items-start gap-3 rounded-xl border border-bz-line p-3 cursor-pointer hover:bg-bz-bg">
                      <input type="checkbox" checked={form.permissions.includes(p.key)} onChange={() => togglePerm(p.key)} className="mt-0.5" />
                      <span><span className="block text-sm font-semibold text-bz-ink">{p.label}</span><span className="block text-xs text-bz-muted">{p.hint}</span></span>
                    </label>
                  ))}
                </div>
              </Field>
              {branches.length > 0 && (
                <Field label={t("حصره على فرع")} hint={t("موظف الفرع يرى طلبات فرعه فقط")}>
                  <select className="w-full h-11 px-3 border border-bz-line" value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })}>
                    <option value="">{t("كل الفروع")}</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </Field>
              )}
            </div>
            <button disabled={saving} onClick={save} className="bz-btn w-full mt-6 h-12">{saving ? t("جارٍ الحفظ…") : t("حفظ")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-bz-ink mb-1.5">{label}</p>
      {children}
      {hint && <p className="text-xs text-bz-muted mt-1">{hint}</p>}
    </div>
  );
}
