'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Search, Download } from 'lucide-react';

const B = { p: '#0A0A0A', s: '#1A1A1A', a: '#2342FF', soft: '#FFF06B' };

interface AdminOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
  createdAt: string;
  store: { name: string; slug: string };
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:   { bg: '#FFF1A8', color: '#7A4A00', label: 'قيد الانتظار' },
  PAID:      { bg: '#BFF2CF', color: '#006B32', label: 'مدفوع' },
  SHIPPED:   { bg: '#FFF06B', color: '#1A30CC', label: 'تم الشحن' },
  DELIVERED: { bg: '#BFF2CF', color: '#006B32', label: 'تم التسليم' },
  CANCELLED: { bg: '#FFC4BC', color: '#B80F00', label: 'ملغي' },
};

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function AdminOrdersPage() {
  useDocumentTitle('كل الطلبات');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await api.get<{ success: boolean; data: AdminOrder[]; pagination: { total: number } }>(
        `/api/admin/orders?${params}`
      );
      setOrders(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch {
      toast.error('فشل تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = async () => {
    setDownloading(true);
    try {
      const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const token = localStorage.getItem('sb_token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/admin/orders/export${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'orders.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('فشل التصدير');
    } finally {
      setDownloading(false);
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      !search ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
      o.store.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: B.p, margin: 0 }}>جميع الطلبات</h1>
          <p style={{ fontSize: 13, color: '#4A463F', margin: '4px 0 0' }}>{total} طلب في جميع المتاجر</p>
        </div>
        <button
          onClick={exportCsv}
          disabled={downloading}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: '#fff', border: `1.5px solid #0A0A0A`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: B.p, cursor: 'pointer', fontFamily: 'inherit', opacity: downloading ? 0.7 : 1 }}
        >
          <Download size={15} />
          {downloading ? 'جارٍ التصدير...' : 'تصدير CSV'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#8A8478' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن طلب..."
            style={{ width: '100%', padding: '9px 36px 9px 12px', border: '1.5px solid #0A0A0A', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '9px 14px', border: '1.5px solid #0A0A0A', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff', color: B.p }}
        >
          <option value="ALL">كل الحالات</option>
          <option value="PENDING">قيد الانتظار</option>
          <option value="PAID">مدفوع</option>
          <option value="SHIPPED">تم الشحن</option>
          <option value="DELIVERED">تم التسليم</option>
          <option value="CANCELLED">ملغي</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 56, background: '#D9D1C0', borderRadius: 10 }} />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#8A8478', fontSize: 14 }}>لا يوجد طلبات</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #0A0A0A', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #0A0A0A', background: '#F1ECE2' }}>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: B.p, fontSize: 12 }}>رقم الطلب</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: B.p, fontSize: 12 }}>العميل</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: B.p, fontSize: 12 }}>المتجر</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: B.p, fontSize: 12 }}>المجموع</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: B.p, fontSize: 12 }}>الحالة</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: B.p, fontSize: 12 }}>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, idx) => {
                const st = STATUS_STYLES[order.status] ?? { bg: '#F1ECE2', color: '#4A463F', label: order.status };
                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid #F1ECE2', background: idx % 2 === 0 ? '#fff' : '#FFFFFF' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#8A8478' }}>
                      #{order.id.slice(-8).toUpperCase()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ fontWeight: 600, color: B.p, margin: 0 }}>{order.customerName}</p>
                      <p style={{ fontSize: 11, color: '#8A8478', margin: 0 }}>{order.customerEmail}</p>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#4A463F' }}>{order.store.name}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: B.p }}>{formatCurrency(order.total)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10, background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#8A8478', fontSize: 11 }}>{formatDateTime(order.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
