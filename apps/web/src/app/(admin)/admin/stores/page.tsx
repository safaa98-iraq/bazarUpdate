'use client';

import { useT } from '@/lib/i18n';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useEditorStore } from '@/lib/stores/editor.store';
import { Search, ToggleLeft, ToggleRight, ExternalLink, PenSquare, ChevronLeft, ShieldOff, ShieldCheck, X } from 'lucide-react';

const B = { p: '#0B3550', s: '#32506A', a: '#20A9F4', soft: '#E3F5FE' };

interface StoreItem {
  id: string; name: string; slug: string;
  isActive: boolean; isPublished: boolean; createdAt: string;
  suspendedAt?: string | null; suspendReason?: string | null;
  merchant: { id: string; name: string; email: string; plan: string };
  _count: { products: number; orders: number };
}

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function AdminStoresPage() {
  const t = useT();
  useDocumentTitle(t("المتاجر"));
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [suspendModal, setSuspendModal] = useState<StoreItem | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);
  const { enterEditorMode } = useEditorStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get<{ success: boolean; data: StoreItem[]; pagination: { total: number } }>(
        `/api/admin/stores${params}`
      );
      setStores(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch {
      toast.error(t("فشل تحميل المتاجر"));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const toggleStore = async (id: string, enable: boolean) => {
    setTogglingId(id);
    try {
      await api.patch(`/api/admin/stores/${id}/${enable ? 'enable' : 'disable'}`);
      setStores((prev) => prev.map((s) => s.id === id ? { ...s, isActive: enable } : s));
      toast.success(enable ? t("تم تفعيل المتجر") : t("تم تعطيل المتجر"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("فشل الإجراء"));
    } finally {
      setTogglingId(null);
    }
  };

  const handleEnterEditor = async (store: StoreItem) => {
    try {
      await api.post(`/api/admin/stores/${store.id}/editor/enter`);
      enterEditorMode({ id: store.id, name: store.name });
      toast.success(t("تم الدخول إلى وضع التحرير لـ {0}", [store.name]));
    } catch {
      toast.error(t("فشل الدخول إلى وضع التحرير"));
    }
  };

  const handleSuspend = async () => {
    if (!suspendModal) return;
    setSuspending(true);
    try {
      await api.patch(`/api/admin/stores/${suspendModal.id}/suspend`, { reason: suspendReason || t("موقوف من قبل المشرف") });
      setStores(prev => prev.map(s => s.id === suspendModal.id
        ? { ...s, isActive: false, suspendedAt: new Date().toISOString(), suspendReason: suspendReason || t("موقوف من قبل المشرف") }
        : s
      ));
      toast.success(t("تم إيقاف متجر \"{0}\"", [suspendModal.name]));
      setSuspendModal(null);
      setSuspendReason('');
    } catch {
      toast.error(t("فشل إيقاف المتجر"));
    } finally {
      setSuspending(false);
    }
  };

  const handleUnsuspend = async (id: string) => {
    try {
      await api.patch(`/api/admin/stores/${id}/unsuspend`);
      setStores(prev => prev.map(s => s.id === id
        ? { ...s, isActive: true, suspendedAt: null, suspendReason: null }
        : s
      ));
      toast.success(t("تم رفع الإيقاف عن المتجر"));
    } catch {
      toast.error(t("فشل رفع الإيقاف"));
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: B.p, margin: 0 }}>{t("المتاجر")}</h1>
          <p style={{ fontSize: 13, color: '#5B6B7B', margin: '4px 0 0' }}>{total} {' '}{t("متجر إجمالاً")}</p>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#A3B0BC' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("ابحث عن متجر...")}
          style={{ width: '100%', padding: '9px 36px 9px 12px', border: '1.5px solid #E6ECF1', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 80, background: '#E6ECF1', borderRadius: 12 }} />)}
        </div>
      ) : stores.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#A3B0BC', fontSize: 14 }}>{t("لا يوجد متاجر")}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stores.map((store) => {
            const isSuspended = !store.isActive && !!store.suspendedAt;
            return (
              <div key={store.id} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', border: '1px solid #E6ECF1', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EEF2F6', color: B.p, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                  {store.name.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <p style={{ fontWeight: 700, color: B.p, margin: 0, fontSize: 14 }}>{store.name}</p>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: isSuspended ? '#FDECEC' : store.isActive ? '#E2F7EE' : '#F6F8FA', color: isSuspended ? '#F04F4F' : store.isActive ? '#22B07D' : '#5B6B7B' }}>
                      {isSuspended ? t("موقوف") : store.isActive ? t("نشط") : t("معطّل")}
                    </span>
                    {store.isPublished && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#EEF2F6', color: B.s }}>{t("منشور")}</span>}
                  </div>
                  <p style={{ fontSize: 12, color: '#5B6B7B', margin: '3px 0 0' }}>
                    /store/{store.slug} · {store._count.products} {' '}{t("منتج ·")}{' '}{store._count.orders} {' '}{t("طلب")}
                  </p>
                  <p style={{ fontSize: 11, color: '#A3B0BC', margin: '2px 0 0' }}>
                    
                    {t("المالك:")}{' '}{store.merchant.name} ({store.merchant.plan}) · {formatDate(store.createdAt)}
                  </p>
                  {isSuspended && store.suspendReason && (
                    <p style={{ fontSize: 11, color: '#F04F4F', margin: '2px 0 0' }}>{t("السبب:")}{' '}{store.suspendReason}</p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isSuspended ? (
                    <button onClick={() => handleUnsuspend(store.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#22B07D', background: '#E2F7EE', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <ShieldCheck size={13} /> {' '}{t("رفع الإيقاف")}
                    </button>
                  ) : (
                    <button onClick={() => { setSuspendModal(store); setSuspendReason(''); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#F04F4F', background: '#FDECEC', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <ShieldOff size={13} /> {' '}{t("إيقاف")}
                    </button>
                  )}

                  {!isSuspended && (
                    <button
                      onClick={() => toggleStore(store.id, !store.isActive)}
                      disabled={togglingId === store.id}
                      title={store.isActive ? t("تعطيل المتجر") : t("تفعيل المتجر")}
                      style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 10, color: store.isActive ? '#22B07D' : '#A3B0BC', opacity: togglingId === store.id ? 0.5 : 1 }}
                    >
                      {store.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                  )}

                  <button onClick={() => handleEnterEditor(store)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: B.s, background: '#EEF2F6', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <PenSquare size={13} /> {' '}{t("تحرير")}
                  </button>

                  <a href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer"
                    style={{ padding: 6, background: 'transparent', borderRadius: 10, color: '#A3B0BC', display: 'flex', alignItems: 'center' }}>
                    <ExternalLink size={15} />
                  </a>

                  <Link href={`/admin/stores/${store.id}`} style={{ padding: 6, background: 'transparent', borderRadius: 10, color: '#A3B0BC', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={15} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.5)' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 28, width: '100%', maxWidth: 400, margin: '0 16px', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 800, color: B.p, margin: 0, fontSize: 16 }}>{t("إيقاف المتجر")}</h3>
              <button onClick={() => setSuspendModal(null)} style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 10, color: '#A3B0BC' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#5B6B7B', marginBottom: 16 }}>
              
              {t("إيقاف")}{' '}<strong>{suspendModal.name}</strong> {' '}{t("سيجعله غير متاح للعملاء فوراً.")}
            </p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: B.p, marginBottom: 6 }}>{t("سبب الإيقاف")}</label>
            <textarea
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              placeholder={t("أدخل سبب الإيقاف (سيظهر لصاحب المتجر)...")}
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #F5A3A3', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setSuspendModal(null)}
                style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600, color: '#5B6B7B', background: '#F6F8FA', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                
                {t("إلغاء")}
              </button>
              <button onClick={handleSuspend} disabled={suspending}
                style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700, color: '#fff', background: '#F04F4F', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', opacity: suspending ? 0.7 : 1 }}>
                {suspending ? t("جارٍ الإيقاف...") : t("إيقاف المتجر")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
