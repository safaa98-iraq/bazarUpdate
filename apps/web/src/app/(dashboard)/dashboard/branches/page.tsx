'use client';

import { useT } from '@/lib/i18n';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, ArrowLeftRight, Search, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { canUseFeature, type Plan } from '@/lib/plan-features';
import { ClayIcon } from '@/components/ui/ClayIcon';
import { UpgradeNotice } from '@/components/dashboard/UpgradeNotice';
import { IRAQI_GOVERNORATES, type WarehousePublic } from '@storebuilder/types';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

type Matrix = {
  warehouses: { id: string; name: string }[];
  products: { id: string; name: string; total: number; image: string | null; stock: Record<string, number> }[];
};
type BranchForm = { id?: string; name: string; governorate: string; address: string; phone: string; servesGovernorates: string[] };
const EMPTY: BranchForm = { name: '', governorate: '', address: '', phone: '', servesGovernorates: [] };

export default function BranchesPage() {
  const t = useT();
  useDocumentTitle(t("الفروع والمخازن"));
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const allowed = canUseFeature(plan, 'branches');
  const [branches, setBranches] = useState<WarehousePublic[]>([]);
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<BranchForm | null>(null);
  const [transfer, setTransfer] = useState<{ productId: string; name: string; fromId: string; toId: string; quantity: number } | null>(null);

  const loadBranches = () => api.get<{ data: WarehousePublic[] }>('/api/warehouses').then(r => setBranches(r.data)).catch(e => toast.error(e.message));
  const loadMatrix = (q = search) => api.get<{ data: Matrix }>(`/api/warehouses/stock?search=${encodeURIComponent(q)}`).then(r => setMatrix(r.data)).catch(() => null);
  useEffect(() => { loadBranches(); loadMatrix(''); }, []);

  const saveBranch = async () => {
    if (!form) return;
    try {
      if (form.id) await api.patch(`/api/warehouses/${form.id}`, form);
      else await api.post('/api/warehouses', form);
      toast.success(t("تم حفظ الفرع")); setForm(null); loadBranches(); loadMatrix();
    } catch (e) { toast.error((e as Error).message); }
  };
  const removeBranch = async (b: WarehousePublic) => {
    if (!confirm(t("حذف {0}؟ سينتقل مخزونه إلى الفرع الرئيسي.", [b.name]))) return;
    try { await api.delete(`/api/warehouses/${b.id}`); loadBranches(); loadMatrix(); } catch (e) { toast.error((e as Error).message); }
  };
  const makeDefault = async (b: WarehousePublic) => {
    try { await api.patch(`/api/warehouses/${b.id}`, { isDefault: true }); loadBranches(); } catch (e) { toast.error((e as Error).message); }
  };
  const setCell = async (productId: string, warehouseId: string, quantity: number) => {
    try {
      const r = await api.put<{ data: { total: number } }>('/api/warehouses/stock', { productId, warehouseId, quantity });
      setMatrix(m => m && ({ ...m, products: m.products.map(p => p.id === productId ? { ...p, total: r.data.total, stock: { ...p.stock, [warehouseId]: quantity } } : p) }));
    } catch (e) { toast.error((e as Error).message); }
  };
  const doTransfer = async () => {
    if (!transfer) return;
    try { await api.post('/api/warehouses/transfer', transfer); toast.success(t("تم نقل الكمية")); setTransfer(null); loadMatrix(); loadBranches(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const totalUnits = useMemo(() => branches.reduce((n, b) => n + b.totalUnits, 0), [branches]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-12 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="bz-large-title">{t("الفروع والمخازن")}</h1>
          <p className="text-sm text-bz-muted mt-1">{t("كل طلب جديد يُحوَّل تلقائياً للفرع الذي يخدم محافظة الزبون ويتوفر فيه المنتج.")}</p>
        </div>
        {allowed && <button onClick={() => setForm({ ...EMPTY })} className="bz-btn"><Plus className="h-4 w-4" /> {' '}{t("فرع جديد")}</button>}
      </div>

      {!allowed && <UpgradeNotice feature="branches" />}

      {allowed && branches.length === 0 && (
        <div className="bz-card p-10 text-center">
          <ClayIcon name="location" size={84} className="mx-auto mb-4" />
          <p className="bz-headline">{t("أضف فرعك الأول")}</p>
          <p className="text-sm text-bz-muted mt-1 mb-5">{t("أول فرع يأخذ مخزونك الحالي كاملاً، ثم توزّعه على باقي الفروع.")}</p>
          <button onClick={() => setForm({ ...EMPTY })} className="bz-btn">{t("إضافة فرع")}</button>
        </div>
      )}

      {allowed && branches.length > 0 && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {branches.map(b => (
              <div key={b.id} className="bz-card p-5">
                <div className="flex items-start gap-3">
                  <span className="h-12 w-12 rounded-2xl bg-bz-brand-50 flex items-center justify-center"><ClayIcon name={b.isDefault ? 'store' : 'location'} size={34} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-bz-ink truncate">{b.name} {b.isDefault && <span className="bz-chip bg-bz-brand-100 text-bz-brand-600 mr-1">{t("الرئيسي")}</span>}</p>
                    <p className="text-xs text-bz-muted">{b.governorate || '—'}{b.phone ? ` · ${b.phone}` : ''}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="rounded-xl bg-bz-bg p-3"><p className="text-xs text-bz-muted">{t("القطع في المخزن")}</p><p className="font-bold text-bz-ink tabular-nums">{b.totalUnits.toLocaleString('en-US')}</p></div>
                  <div className="rounded-xl bg-bz-bg p-3"><p className="text-xs text-bz-muted">{t("الطلبات")}</p><p className="font-bold text-bz-ink tabular-nums">{b.ordersCount}</p></div>
                </div>
                {b.servesGovernorates.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">{b.servesGovernorates.map(g => <span key={g} className="bz-chip bg-white border border-bz-line text-bz-ink-2">{g}</span>)}</div>
                )}
                <div className="flex gap-1 mt-4 border-t border-bz-line pt-3">
                  <button onClick={() => setForm({ id: b.id, name: b.name, governorate: b.governorate ?? '', address: b.address ?? '', phone: b.phone ?? '', servesGovernorates: b.servesGovernorates })} className="bz-btn bz-btn-plain h-9 px-3 text-sm"><Pencil className="h-4 w-4" /> {' '}{t("تعديل")}</button>
                  {!b.isDefault && <button onClick={() => makeDefault(b)} className="bz-btn bz-btn-plain h-9 px-3 text-sm"><Star className="h-4 w-4" /> {' '}{t("رئيسي")}</button>}
                  <button onClick={() => removeBranch(b)} className="bz-btn bz-btn-plain h-9 px-3 text-sm text-bz-red mr-auto"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="bz-title-2">{t("المخزون حسب الفرع")}{' '}<span className="text-sm font-normal text-bz-muted">({totalUnits.toLocaleString('en-US')} {' '}{t("قطعة)")}</span></h2>
            <label className="bz-search w-72 max-w-full">
              <Search className="h-4 w-4" />
              <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadMatrix()} placeholder={t("ابحث عن منتج…")} className="flex-1 bg-transparent outline-none !border-0 !shadow-none !p-0 text-sm" />
            </label>
          </div>
          {matrix && (
            <div className="bz-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-right px-4 py-3">{t("المنتج")}</th>
                    {matrix.warehouses.map(w => <th key={w.id} className="px-3 py-3 text-center whitespace-nowrap">{w.name}</th>)}
                    <th className="px-3 py-3 text-center">{t("المجموع")}</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {matrix.products.map(p => (
                    <tr key={p.id} className="border-t border-bz-line">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {p.image ? <img src={p.image} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="h-9 w-9 rounded-lg bg-bz-bg" />}
                          <span className="font-medium text-bz-ink">{p.name}</span>
                        </div>
                      </td>
                      {matrix.warehouses.map(w => (
                        <td key={w.id} className="px-3 py-2 text-center">
                          <input type="number" min={0} defaultValue={p.stock[w.id] ?? 0}
                            onBlur={e => { const v = Math.max(0, Number(e.target.value) || 0); if (v !== (p.stock[w.id] ?? 0)) setCell(p.id, w.id, v); }}
                            className={`w-20 h-9 text-center border ${(p.stock[w.id] ?? 0) < 0 ? 'border-bz-red text-bz-red' : 'border-bz-line'}`} />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-bold tabular-nums">{p.total}</td>
                      <td className="px-3 py-2">
                        {matrix.warehouses.length > 1 && (
                          <button title={t("نقل بين الفروع")} onClick={() => setTransfer({ productId: p.id, name: p.name, fromId: matrix.warehouses[0].id, toId: matrix.warehouses[1].id, quantity: 1 })}
                            className="h-9 w-9 rounded-full hover:bg-bz-bg flex items-center justify-center text-bz-muted"><ArrowLeftRight className="h-4 w-4" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {form && (
        <Modal title={form.id ? t("تعديل الفرع") : t("فرع جديد")} onClose={() => setForm(null)}>
          <div className="space-y-4">
            <L label={t("اسم الفرع")}><input className="w-full h-11 px-3 border border-bz-line" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t("مثال: فرع المنصور")} /></L>
            <div className="grid grid-cols-2 gap-3">
              <L label={t("المحافظة")}>
                <select className="w-full h-11 px-3 border border-bz-line" value={form.governorate} onChange={e => setForm({ ...form, governorate: e.target.value })}>
                  <option value="">—</option>{IRAQI_GOVERNORATES.map(g => <option key={g}>{g}</option>)}
                </select>
              </L>
              <L label={t("هاتف الفرع")}><input dir="ltr" className="w-full h-11 px-3 border border-bz-line" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></L>
            </div>
            <L label={t("العنوان")}><input className="w-full h-11 px-3 border border-bz-line" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></L>
            <L label={t("يشحن إلى المحافظات")}>
              <div className="flex flex-wrap gap-1.5">
                {IRAQI_GOVERNORATES.map(g => {
                  const on = form.servesGovernorates.includes(g);
                  return (
                    <button key={g} type="button" onClick={() => setForm({ ...form, servesGovernorates: on ? form.servesGovernorates.filter(x => x !== g) : [...form.servesGovernorates, g] })}
                      className={`bz-chip border ${on ? 'bg-bz-brand text-white border-bz-brand' : 'bg-white border-bz-line text-bz-ink-2'}`}>{g}</button>
                  );
                })}
              </div>
            </L>
          </div>
          <button onClick={saveBranch} className="bz-btn w-full mt-6 h-12">{t("حفظ")}</button>
        </Modal>
      )}

      {transfer && matrix && (
        <Modal title={t("نقل: {0}", [transfer.name])} onClose={() => setTransfer(null)}>
          <div className="grid grid-cols-2 gap-3">
            <L label={t("من فرع")}><select className="w-full h-11 px-3 border border-bz-line" value={transfer.fromId} onChange={e => setTransfer({ ...transfer, fromId: e.target.value })}>{matrix.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></L>
            <L label={t("إلى فرع")}><select className="w-full h-11 px-3 border border-bz-line" value={transfer.toId} onChange={e => setTransfer({ ...transfer, toId: e.target.value })}>{matrix.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></L>
          </div>
          <L label={t("الكمية")}><input type="number" min={1} className="w-full h-11 px-3 border border-bz-line mt-1" value={transfer.quantity} onChange={e => setTransfer({ ...transfer, quantity: Number(e.target.value) })} /></L>
          <button onClick={doTransfer} className="bz-btn w-full mt-6 h-12">{t("نقل")}</button>
        </Modal>
      )}
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="text-sm font-semibold text-bz-ink mb-1.5">{label}</p>{children}</div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="bz-title-2">{title}</h2>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-bz-bg flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
