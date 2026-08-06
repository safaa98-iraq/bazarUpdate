'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { AnalyticsData } from '@storebuilder/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { DollarSign, Users, Store, TrendingUp } from 'lucide-react';

const B = { p: '#2F2E4B', s: '#4A4767', a: '#DB6E93', soft: '#FBE1EA' };

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function AdminAnalyticsPage() {
  useDocumentTitle('التحليلات');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; data: AnalyticsData }>('/api/admin/analytics')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ height: 32, background: '#ECE6F0', borderRadius: 10, width: 200 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: B.p, margin: 0 }}>التحليلات</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>نظرة عامة على أداء المنصة</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        <KpiCard title="إجمالي الإيرادات" value={formatCurrency(data?.totalRevenue ?? 0)} icon={<DollarSign size={20} color="#059669" />} bg="#D1FAE5" />
        <KpiCard title="إجمالي التجار" value={String(data?.totalMerchants ?? 0)} icon={<Users size={20} color={B.s} />} bg="#F0E7F8" />
        <KpiCard title="المتاجر النشطة" value={String(data?.activeStores ?? 0)} icon={<Store size={20} color="#2563EB" />} bg="#DBEAFE" />
        <KpiCard title="تجار جدد" value={`+${data?.newMerchantsThisMonth ?? 0}`} icon={<TrendingUp size={20} color={B.a} />} bg="#FCE7EC" sub="هذا الشهر" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Revenue by month */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 24, border: '1px solid #ECE6F0' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: B.p, marginBottom: 16 }}>الإيرادات الشهرية</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data?.revenueByMonth ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5EFFA" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="revenue" stroke={B.a} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top stores bar */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 24, border: '1px solid #ECE6F0' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: B.p, marginBottom: 16 }}>أفضل 5 متاجر بالإيرادات</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data?.topStores ?? []} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
              <YAxis type="category" dataKey="storeName" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="totalRevenue" fill={B.a} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top stores table */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ECE6F0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #ECE6F0' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: B.p, margin: 0 }}>أفضل المتاجر أداءً</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F5EFFA' }}>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: B.p, fontSize: 12 }}>#</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: B.p, fontSize: 12 }}>المتجر</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: B.p, fontSize: 12 }}>الطلبات</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: B.p, fontSize: 12 }}>الإيرادات</th>
            </tr>
          </thead>
          <tbody>
            {data?.topStores?.map((s, i) => (
              <tr key={s.storeId} style={{ borderTop: '1px solid #F5EFFA' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#9CA3AF' }}>{i + 1}</td>
                <td style={{ padding: '12px 16px' }}>
                  <p style={{ fontWeight: 600, color: B.p, margin: 0 }}>{s.storeName}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>/store/{s.slug}</p>
                </td>
                <td style={{ padding: '12px 16px', color: '#6B7280' }}>{s.totalOrders}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: B.p }}>{formatCurrency(s.totalRevenue ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, bg, sub }: { title: string; value: string; icon: React.ReactNode; bg: string; sub?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 20, border: '1px solid #ECE6F0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{title}</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: B.p, margin: '4px 0 0' }}>{value}</p>
          {sub && <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>{sub}</p>}
        </div>
        <div style={{ padding: 12, borderRadius: 10, background: bg }}>{icon}</div>
      </div>
    </div>
  );
}
