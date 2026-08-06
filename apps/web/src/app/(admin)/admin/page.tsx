'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { AnalyticsData } from '@storebuilder/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Users, Store, ShoppingCart, TrendingUp } from 'lucide-react';

const B = { p: '#2F2E4B', s: '#4A4767', a: '#DB6E93', soft: '#FBE1EA' };

type AdminAnalyticsData = AnalyticsData;

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function AdminDashboard() {
  useDocumentTitle('لوحة الإدارة');
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; data: AdminAnalyticsData }>('/api/admin/analytics')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ height: 32, background: '#ECE6F0', borderRadius: 10, width: 200, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 112, background: '#ECE6F0', borderRadius: 16 }} />)}
        </div>
      </div>
    );
  }

  const merchantPieData = [
    { name: 'نشط', value: data?.activeMerchants ?? 0 },
    { name: 'غير نشط', value: data?.inactiveMerchants ?? 0 },
  ];

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: B.p, marginBottom: 28 }}>لوحة التحكم</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard title="إجمالي الإيرادات" value={formatCurrency(data?.totalRevenue ?? 0)} icon={<DollarSign size={20} color="#059669" />} bg="#D1FAE5" />
        <StatCard title="إجمالي الطلبات" value={String(data?.totalOrders ?? 0)} icon={<ShoppingCart size={20} color="#2563EB" />} bg="#DBEAFE" />
        <StatCard title="التجار" value={String(data?.totalMerchants ?? 0)} icon={<Users size={20} color={B.s} />} bg="#F0E7F8" sub={`+${data?.newMerchantsThisMonth ?? 0} هذا الشهر`} />
        <StatCard title="المتاجر النشطة" value={`${data?.activeStores ?? 0}/${data?.totalStores ?? 0}`} icon={<Store size={20} color={B.a} />} bg="#FCE7EC" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: 24, border: '1px solid #ECE6F0' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: B.p, marginBottom: 16 }}>الإيرادات (آخر 6 أشهر)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.revenueByMonth ?? []}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="revenue" fill={B.a} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#fff', borderRadius: 10, padding: 24, border: '1px solid #ECE6F0' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: B.p, marginBottom: 8 }}>حالة التجار</h2>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PieChart width={180} height={180}>
              <Pie data={merchantPieData} dataKey="value" cx={90} cy={90} innerRadius={55} outerRadius={80}>
                <Cell fill={B.a} />
                <Cell fill="#ECE6F0" />
              </Pie>
            </PieChart>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: B.a, display: 'inline-block' }} /><span>نشط: {data?.activeMerchants ?? 0}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ECE6F0', display: 'inline-block' }} /><span>غير نشط: {data?.inactiveMerchants ?? 0}</span></div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, padding: 24, border: '1px solid #ECE6F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: B.p }}>أفضل المتاجر أداءً</h2>
          <TrendingUp size={16} color="#9CA3AF" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data?.topStores?.length ? (
            data.topStores.map((s, i) => (
              <div key={s.storeId} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13 }}>
                <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0E7F8', color: B.p, borderRadius: '50%', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: B.p, margin: 0 }}>{s.storeName}</p>
                  <p style={{ color: '#9CA3AF', fontSize: 11, margin: 0 }}>/store/{s.slug} · {s.totalOrders} طلب</p>
                </div>
                <span style={{ fontWeight: 700, color: B.p }}>{formatCurrency(s.totalRevenue ?? 0)}</span>
              </div>
            ))
          ) : (
            <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>لا توجد بيانات متاجر بعد</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bg, sub }: { title: string; value: string; icon: React.ReactNode; bg: string; sub?: string }) {
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
