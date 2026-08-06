'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sparkles, DollarSign, Zap, BarChart2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';

const B = { p: '#2F2E4B', s: '#4A4767', a: '#DB6E93', soft: '#FBE1EA' };

interface CostData {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  byFeature: { feature: string; requests: number; tokens: number; cost: number }[];
  dailyCost: { date: string; cost: number; tokens: number; requests: number }[];
}

interface UsageLog {
  id: string;
  merchantId: string;
  feature: string;
  tokensUsed: number;
  cost: number;
  createdAt: string;
  merchant: { name: string; email: string };
}

interface MerchantStat {
  merchantId: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
}

interface UsageResponse {
  data: UsageLog[];
  merchantStats: MerchantStat[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const featureLabels: Record<string, string> = {
  'generate-description': 'توليد الوصف',
  'suggest-price': 'اقتراح السعر',
  'generate-seo': 'توليد SEO',
};

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function AdminAIPage() {
  useDocumentTitle('تكلفة الذكاء الاصطناعي');
  const [costData, setCostData] = useState<CostData | null>(null);
  const [usageData, setUsageData] = useState<UsageResponse | null>(null);
  const [loadingCost, setLoadingCost] = useState(true);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [limitInputs, setLimitInputs] = useState<Record<string, string>>({});
  const [savingLimits, setSavingLimits] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'cost' | 'usage' | 'limits'>('cost');

  const loadCost = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: CostData }>('/api/ai/admin/cost');
      setCostData(res.data);
    } catch { toast.error('فشل تحميل بيانات التكلفة'); }
    finally { setLoadingCost(false); }
  }, []);

  const loadUsage = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean } & UsageResponse>('/api/ai/admin/usage');
      setUsageData(res as unknown as UsageResponse);
      const inputs: Record<string, string> = {};
      (res as unknown as UsageResponse).merchantStats?.forEach((s) => { inputs[s.merchantId] = ''; });
      setLimitInputs(inputs);
    } catch { toast.error('فشل تحميل الاستخدام'); }
    finally { setLoadingUsage(false); }
  }, []);

  useEffect(() => { loadCost(); loadUsage(); }, [loadCost, loadUsage]);

  const saveLimit = async (merchantId: string, limit: string) => {
    const n = parseInt(limit);
    if (isNaN(n) || n < 0) { toast.error('حد غير صالح'); return; }
    setSavingLimits(p => ({ ...p, [merchantId]: true }));
    try {
      await api.patch(`/api/ai/admin/limits/${merchantId}`, { limit: n });
      toast.success('تم تحديث الحد');
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'فشل'); }
    finally { setSavingLimits(p => ({ ...p, [merchantId]: false })); }
  };

  const totalCostFormatted = costData ? `$${costData.totalCost.toFixed(4)}` : '—';

  const TABS = [
    { key: 'cost', label: 'لوحة التكاليف' },
    { key: 'usage', label: 'سجل الاستخدام' },
    { key: 'limits', label: 'حدود التجار' },
  ] as const;

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: '#F0E7F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={22} color={B.s} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: B.p, margin: 0 }}>الذكاء الاصطناعي</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>مراقبة الاستخدام، تحديد الحدود، وتتبع التكاليف</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'إجمالي الطلبات', value: costData?.totalRequests ?? '—', icon: <Zap size={20} color={B.s} />, bg: '#F0E7F8' },
          { label: 'إجمالي التوكنز', value: costData?.totalTokens?.toLocaleString('en') ?? '—', icon: <BarChart2 size={20} color="#2563EB" />, bg: '#DBEAFE' },
          { label: 'إجمالي التكلفة', value: totalCostFormatted, icon: <DollarSign size={20} color="#059669" />, bg: '#D1FAE5' },
          { label: 'متوسط لكل طلب', value: costData && costData.totalRequests > 0 ? `$${(costData.totalCost / costData.totalRequests).toFixed(5)}` : '—', icon: <Sparkles size={20} color={B.a} />, bg: '#FCE7EC' },
        ].map(({ label, value, icon, bg }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 10, border: '1px solid #ECE6F0', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: B.p, margin: '4px 0 0' }}>{String(value)}</p>
              </div>
              <div style={{ padding: 10, borderRadius: 10, background: bg }}>{icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#F0E7F8', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', background: activeTab === key ? '#fff' : 'transparent', color: activeTab === key ? B.p : '#6B7280', boxShadow: activeTab === key ? '0 1px 4px rgba(0,0,0,.1)' : 'none' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Cost Dashboard */}
      {activeTab === 'cost' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {loadingCost ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}><Loader2 size={24} color={B.s} style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : (
            <>
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ECE6F0', padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: B.p, marginBottom: 16 }}>التكلفة اليومية — آخر 7 أيام</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={costData?.dailyCost ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5EFFA" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(3)}`} />
                    <Tooltip formatter={(v: number) => [`$${v.toFixed(5)}`, 'تكلفة']} />
                    <Line type="monotone" dataKey="cost" stroke={B.a} strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ECE6F0', padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: B.p, marginBottom: 16 }}>الاستخدام حسب الميزة</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={costData?.byFeature.map(f => ({ ...f, label: featureLabels[f.feature] ?? f.feature })) ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5EFFA" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="requests" fill={B.s} radius={4} />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 16 }}>
                  {costData?.byFeature.map((f) => (
                    <div key={f.feature} style={{ background: '#F5EFFA', borderRadius: 10, padding: 12 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: B.p, margin: 0 }}>{featureLabels[f.feature] ?? f.feature}</p>
                      <p style={{ fontSize: 18, fontWeight: 800, color: B.p, margin: '4px 0 0' }}>{f.requests}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>${f.cost.toFixed(5)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Usage Logs */}
      {activeTab === 'usage' && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ECE6F0', overflow: 'hidden' }}>
          {loadingUsage ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}><Loader2 size={24} color={B.s} style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F5EFFA', borderBottom: '1px solid #ECE6F0' }}>
                  {['التاجر', 'الميزة', 'التوكنز', 'التكلفة', 'التاريخ'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: B.p, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usageData?.data?.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: '#9CA3AF' }}>لا يوجد استخدام للذكاء الاصطناعي بعد</td></tr>
                ) : usageData?.data?.map((log, idx) => (
                  <tr key={log.id} style={{ borderTop: '1px solid #F5EFFA', background: idx % 2 === 0 ? '#fff' : '#FDFCFE' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ fontWeight: 600, color: B.p, margin: 0 }}>{log.merchant.name}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{log.merchant.email}</p>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10, background: '#F0E7F8', color: B.s }}>
                        {featureLabels[log.feature] ?? log.feature}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6B7280' }}>{log.tokensUsed.toLocaleString('en')}</td>
                    <td style={{ padding: '12px 16px', color: '#6B7280' }}>${Number(log.cost).toFixed(5)}</td>
                    <td style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: 11 }}>{formatDateTime(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Merchant Limits */}
      {activeTab === 'limits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#854D0E' }}>
            حدد عدد طلبات الذكاء الاصطناعي اليومية لكل تاجر. الحد الافتراضي هو 50 طلب/يوم. التغييرات تسري فوراً.
          </div>
          {loadingUsage ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}><Loader2 size={24} color={B.s} style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ECE6F0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F5EFFA', borderBottom: '1px solid #ECE6F0' }}>
                    {['التاجر', 'الطلبات', 'التوكنز', 'التكلفة', 'الحد اليومي', ''].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: B.p, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usageData?.merchantStats?.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: '#9CA3AF' }}>لا يوجد استخدام مسجّل</td></tr>
                  ) : usageData?.merchantStats?.map((stat, idx) => (
                    <tr key={stat.merchantId} style={{ borderTop: '1px solid #F5EFFA', background: idx % 2 === 0 ? '#fff' : '#FDFCFE' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: B.p, fontFamily: 'monospace', fontSize: 12 }}>{stat.merchantId.slice(-8)}</td>
                      <td style={{ padding: '12px 16px', color: '#6B7280' }}>{stat.totalRequests}</td>
                      <td style={{ padding: '12px 16px', color: '#6B7280' }}>{stat.totalTokens.toLocaleString('en')}</td>
                      <td style={{ padding: '12px 16px', color: '#6B7280' }}>${stat.totalCost.toFixed(5)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="number"
                          min="0"
                          max="10000"
                          placeholder="50"
                          value={limitInputs[stat.merchantId] ?? ''}
                          onChange={e => setLimitInputs(p => ({ ...p, [stat.merchantId]: e.target.value }))}
                          style={{ width: 80, padding: '5px 8px', border: '1.5px solid #ECE6F0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'left' }}>
                        <button
                          onClick={() => saveLimit(stat.merchantId, limitInputs[stat.merchantId] ?? '')}
                          disabled={savingLimits[stat.merchantId] || !limitInputs[stat.merchantId]}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: B.a, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: (savingLimits[stat.merchantId] || !limitInputs[stat.merchantId]) ? 0.5 : 1 }}
                        >
                          {savingLimits[stat.merchantId] ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />}
                          حفظ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
