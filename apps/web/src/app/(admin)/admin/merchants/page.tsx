'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Search, UserCheck, UserX, Trash2, ChevronLeft } from 'lucide-react';

const B = { p: '#1C1C1E', s: '#3A3A3C', a: '#007AFF', soft: '#E5F1FF' };

const PLAN_LABELS: Record<string, string> = { FREE: 'مجاني', PRO: 'احترافي', ENTERPRISE: 'مؤسسي' };
const PLAN_COLORS: Record<string, string> = { FREE: '#AEAEB2', PRO: B.a, ENTERPRISE: B.p };

interface Merchant {
  id: string;
  email: string;
  name: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  store: { id: string; name: string; slug: string; isActive: boolean; isPublished: boolean } | null;
}

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function MerchantsPage() {
  useDocumentTitle('التجار');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('isActive', statusFilter === 'ACTIVE' ? 'true' : 'false');
      const res = await api.get<{ success: boolean; data: Merchant[]; pagination: { total: number } }>(
        `/api/admin/merchants?${params}`
      );
      setMerchants(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch {
      toast.error('فشل تحميل التجار');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const activate = async (id: string, active: boolean) => {
    setActingId(id);
    try {
      await api.patch(`/api/admin/merchants/${id}/${active ? 'activate' : 'deactivate'}`);
      setMerchants((prev) => prev.map((m) => m.id === id ? { ...m, isActive: active } : m));
      toast.success(active ? 'تم تفعيل التاجر' : 'تم إيقاف التاجر');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل الإجراء');
    } finally {
      setActingId(null);
    }
  };

  const changePlan = async (id: string, plan: string) => {
    try {
      await api.patch(`/api/admin/merchants/${id}/plan`, { plan });
      setMerchants((prev) => prev.map((m) => m.id === id ? { ...m, plan } : m));
      toast.success('تم تحديث الخطة');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل تغيير الخطة');
    }
  };

  const deleteMerchant = async (id: string) => {
    if (!confirm('هل تريد حذف هذا التاجر وكل بياناته نهائياً؟')) return;
    try {
      await api.delete(`/api/admin/merchants/${id}`);
      setMerchants((prev) => prev.filter((m) => m.id !== id));
      setTotal((t) => t - 1);
      toast.success('تم حذف التاجر');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل الحذف');
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: B.p, margin: 0 }}>التجار</h1>
          <p style={{ fontSize: 13, color: '#6C6C70', margin: '4px 0 0' }}>{total} تاجر إجمالاً</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#AEAEB2' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن تاجر..."
            style={{ width: '100%', padding: '9px 36px 9px 12px', border: '1.5px solid #E5E5EA', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '9px 14px', border: '1.5px solid #E5E5EA', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff', color: B.p }}
        >
          <option value="ALL">الكل</option>
          <option value="ACTIVE">نشط</option>
          <option value="INACTIVE">غير نشط</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 80, background: '#E5E5EA', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : merchants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#AEAEB2', fontSize: 14 }}>لا يوجد تجار</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {merchants.map((m) => (
            <div key={m.id} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', border: '1px solid #E5E5EA', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#EFEFF4', color: B.p, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                {m.name.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <p style={{ fontWeight: 700, color: B.p, margin: 0, fontSize: 14 }}>{m.name}</p>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: m.isActive ? '#E3F9E8' : '#FFE9E7', color: m.isActive ? '#34C759' : '#FF3B30' }}>
                    {m.isActive ? 'نشط' : 'موقوف'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#EFEFF4', color: PLAN_COLORS[m.plan] ?? B.p }}>
                    {PLAN_LABELS[m.plan] ?? m.plan}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#6C6C70', margin: '3px 0 0' }}>{m.email} · انضم {formatDate(m.createdAt)}</p>
                {m.store && (
                  <p style={{ fontSize: 11, color: '#AEAEB2', margin: '2px 0 0' }}>المتجر: {m.store.name} (/store/{m.store.slug})</p>
                )}
              </div>

              <select
                value={m.plan}
                onChange={(e) => changePlan(m.id, e.target.value)}
                style={{ fontSize: 12, border: '1.5px solid #E5E5EA', borderRadius: 10, padding: '5px 10px', fontFamily: 'inherit', outline: 'none', background: '#fff', color: B.p }}
              >
                <option value="FREE">مجاني</option>
                <option value="PRO">احترافي</option>
                <option value="ENTERPRISE">مؤسسي</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {m.isActive ? (
                  <button
                    onClick={() => activate(m.id, false)}
                    disabled={actingId === m.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#FF3B30', background: '#FFE9E7', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', opacity: actingId === m.id ? 0.5 : 1 }}
                  >
                    <UserX size={13} /> إيقاف
                  </button>
                ) : (
                  <button
                    onClick={() => activate(m.id, true)}
                    disabled={actingId === m.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#34C759', background: '#E3F9E8', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', opacity: actingId === m.id ? 0.5 : 1 }}
                  >
                    <UserCheck size={13} /> تفعيل
                  </button>
                )}
                <button
                  onClick={() => deleteMerchant(m.id)}
                  style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: '#D1D1D6', borderRadius: 8 }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#FF3B30'; e.currentTarget.style.background = '#FFE9E7'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#D1D1D6'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <Trash2 size={15} />
                </button>
                <Link href={`/admin/merchants/${m.id}`} style={{ padding: 6, background: 'transparent', borderRadius: 10, color: '#AEAEB2', display: 'flex', alignItems: 'center' }}>
                  <ChevronLeft size={15} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
