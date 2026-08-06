'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useEditorStore } from '@/lib/stores/editor.store';
import { Search, ToggleLeft, ToggleRight, ExternalLink, PenSquare, ChevronLeft, ShieldOff, ShieldCheck, X } from 'lucide-react';

const B = { p: '#2F2E4B', s: '#4A4767', a: '#DB6E93', soft: '#FBE1EA' };

interface StoreItem {
  id: string; name: string; slug: string;
  isActive: boolean; isPublished: boolean; createdAt: string;
  suspendedAt?: string | null; suspendReason?: string | null;
  merchant: { id: string; name: string; email: string; plan: string };
  _count: { products: number; orders: number };
}

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function AdminStoresPage() {
  useDocumentTitle('المتاجر');
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
      toast.error('فشل تحميل المتاجر');
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
      toast.success(enable ? 'تم تفعيل المتجر' : 'تم تعطيل المتجر');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل الإجراء');
    } finally {
      setTogglingId(null);
    }
  };

  const handleEnterEditor = async (store: StoreItem) => {
    try {
      await api.post(`/api/admin/stores/${store.id}/editor/enter`);
      enterEditorMode({ id: store.id, name: store.name });
      toast.success(`تم الدخول إلى وضع التحرير لـ ${store.name}`);
    } catch {
      toast.error('فشل الدخول إلى وضع التحرير');
    }
  };

  const handleSuspend = async () => {
    if (!suspendModal) return;
    setSuspending(true);
    try {
      await api.patch(`/api/admin/stores/${suspendModal.id}/suspend`, { reason: suspendReason || 'موقوف من قبل المشرف' });
      setStores(prev => prev.map(s => s.id === suspendModal.id
        ? { ...s, isActive: false, suspendedAt: new Date().toISOString(), suspendReason: suspendReason || 'موقوف من قبل المشرف' }
        : s
      ));
      toast.success(`تم إيقاف متجر "${suspendModal.name}"`);
      setSuspendModal(null);
      setSuspendReason('');
    } catch {
      toast.error('فشل إيقاف المتجر');
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
      toast.success('تم رفع الإيقاف عن المتجر');
    } catch {
      toast.error('فشل رفع الإيقاف');
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: B.p, margin: 0 }}>المتاجر</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>{total} متجر إجمالاً</p>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن متجر..."
          style={{ width: '100%', padding: '9px 36px 9px 12px', border: '1.5px solid #ECE6F0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 80, background: '#ECE6F0', borderRadius: 12 }} />)}
        </div>
      ) : stores.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF', fontSize: 14 }}>لا يوجد متاجر</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stores.map((store) => {
            const isSuspended = !store.isActive && !!store.suspendedAt;
            return (
              <div key={store.id} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', border: '1px solid #ECE6F0', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F0E7F8', color: B.p, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                  {store.name.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <p style={{ fontWeight: 700, color: B.p, margin: 0, fontSize: 14 }}>{store.name}</p>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: isSuspended ? '#FEE2E2' : store.isActive ? '#D1FAE5' : '#F3F4F6', color: isSuspended ? '#DC2626' : store.isActive ? '#059669' : '#6B7280' }}>
                      {isSuspended ? 'موقوف' : store.isActive ? 'نشط' : 'معطّل'}
                    </span>
                    {store.isPublished && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#F0E7F8', color: B.s }}>منشور</span>}
                  </div>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '3px 0 0' }}>
                    /store/{store.slug} · {store._count.products} منتج · {store._count.orders} طلب
                  </p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>
                    المالك: {store.merchant.name} ({store.merchant.plan}) · {formatDate(store.createdAt)}
                  </p>
                  {isSuspended && store.suspendReason && (
                    <p style={{ fontSize: 11, color: '#EF4444', margin: '2px 0 0' }}>السبب: {store.suspendReason}</p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isSuspended ? (
                    <button onClick={() => handleUnsuspend(store.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#059669', background: '#D1FAE5', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <ShieldCheck size={13} /> رفع الإيقاف
                    </button>
                  ) : (
                    <button onClick={() => { setSuspendModal(store); setSuspendReason(''); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#DC2626', background: '#FEE2E2', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <ShieldOff size={13} /> إيقاف
                    </button>
                  )}

                  {!isSuspended && (
                    <button
                      onClick={() => toggleStore(store.id, !store.isActive)}
                      disabled={togglingId === store.id}
                      title={store.isActive ? 'تعطيل المتجر' : 'تفعيل المتجر'}
                      style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 10, color: store.isActive ? '#059669' : '#9CA3AF', opacity: togglingId === store.id ? 0.5 : 1 }}
                    >
                      {store.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                  )}

                  <button onClick={() => handleEnterEditor(store)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: B.s, background: '#F0E7F8', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <PenSquare size={13} /> تحرير
                  </button>

                  <a href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer"
                    style={{ padding: 6, background: 'transparent', borderRadius: 10, color: '#9CA3AF', display: 'flex', alignItems: 'center' }}>
                    <ExternalLink size={15} />
                  </a>

                  <Link href={`/admin/stores/${store.id}`} style={{ padding: 6, background: 'transparent', borderRadius: 10, color: '#9CA3AF', display: 'flex', alignItems: 'center' }}>
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
              <h3 style={{ fontWeight: 800, color: B.p, margin: 0, fontSize: 16 }}>إيقاف المتجر</h3>
              <button onClick={() => setSuspendModal(null)} style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 10, color: '#9CA3AF' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
              إيقاف <strong>{suspendModal.name}</strong> سيجعله غير متاح للعملاء فوراً.
            </p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: B.p, marginBottom: 6 }}>سبب الإيقاف</label>
            <textarea
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              placeholder="أدخل سبب الإيقاف (سيظهر لصاحب المتجر)..."
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #FCA5A5', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setSuspendModal(null)}
                style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                إلغاء
              </button>
              <button onClick={handleSuspend} disabled={suspending}
                style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700, color: '#fff', background: '#EF4444', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', opacity: suspending ? 0.7 : 1 }}>
                {suspending ? 'جارٍ الإيقاف...' : 'إيقاف المتجر'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
