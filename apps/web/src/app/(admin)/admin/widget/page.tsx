'use client';

import { useEffect, useState } from 'react';
import { Code2, Loader2, Eye, MousePointerClick, ShoppingBag, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { WidgetStat } from '@storebuilder/types';

const B = { p: '#0A0A0A', s: '#1A1A1A', a: '#2342FF', soft: '#FFF06B' };

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function AdminWidgetPage() {
  useDocumentTitle('الودجت المضمّن');
  const [stats, setStats] = useState<WidgetStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  // window is undefined during SSR — reading it directly in JSX would render
  // 'http://localhost:3000' on the server and the real origin on the client,
  // breaking hydration. Deferring to state set in useEffect keeps both
  // renders identical until after mount.
  const [origin, setOrigin] = useState('http://localhost:3000');

  const load = async () => {
    try {
      const res = await api.get<{ success: boolean; data: WidgetStat[] }>('/api/widget/admin/stats');
      setStats(res.data ?? []);
    } catch { toast.error('فشل تحميل إحصائيات الويدجت'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const toggleWidget = async (storeId: string, current: boolean) => {
    setToggling(p => ({ ...p, [storeId]: true }));
    try {
      await api.patch(`/api/widget/admin/stores/${storeId}`, { widgetEnabled: !current });
      setStats(prev => prev.map(s => s.storeId === storeId ? { ...s, widgetEnabled: !current } : s));
      toast.success((!current) ? 'تم تفعيل الويدجت' : 'تم إيقاف الويدجت');
    } catch { toast.error('فشل التحديث'); }
    finally { setToggling(p => ({ ...p, [storeId]: false })); }
  };

  const totals = stats.reduce((acc, s) => ({
    impressions: acc.impressions + s.impressions,
    clicks: acc.clicks + s.clicks,
    conversions: acc.conversions + s.conversions,
    enabled: acc.enabled + (s.widgetEnabled ? 1 : 0),
  }), { impressions: 0, clicks: 0, conversions: 0, enabled: 0 });

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: '#E8E1D3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Code2 size={22} color={B.s} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: B.p, margin: 0 }}>إعدادات الويدجت</h1>
          <p style={{ fontSize: 13, color: '#4A463F', margin: 0 }}>إدارة ويدجتات التجارة المدمجة عبر جميع المتاجر</p>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'ويدجتات نشطة', value: totals.enabled, icon: <Code2 size={20} color={B.s} />, bg: '#E8E1D3' },
          { label: 'المشاهدات', value: totals.impressions.toLocaleString('en'), icon: <Eye size={20} color="#2342FF" />, bg: '#FFF06B' },
          { label: 'النقرات', value: totals.clicks.toLocaleString('en'), icon: <MousePointerClick size={20} color="#FF6B00" />, bg: '#FFD9A8' },
          { label: 'التحويلات', value: totals.conversions.toLocaleString('en'), icon: <ShoppingBag size={20} color="#00A651" />, bg: '#BFF2CF' },
        ].map(({ label, value, icon, bg }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 10, border: '1px solid #0A0A0A', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 12, color: '#4A463F', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: B.p, margin: '4px 0 0' }}>{String(value)}</p>
              </div>
              <div style={{ padding: 10, borderRadius: 10, background: bg }}>{icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Conversion rate banner */}
      {totals.clicks > 0 && (
        <div style={{ marginBottom: 24, background: 'linear-gradient(90deg,#E8E1D3,#FFF06B)', border: '1px solid #0A0A0A', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: B.a }}>
            {((totals.conversions / totals.clicks) * 100).toFixed(1)}%
          </div>
          <div>
            <p style={{ fontWeight: 700, color: B.p, margin: 0 }}>متوسط معدل التحويل</p>
            <p style={{ fontSize: 13, color: '#4A463F', margin: 0 }}>{totals.conversions} طلب من {totals.clicks} نقرة عبر جميع الويدجتات</p>
          </div>
        </div>
      )}

      {/* Store table */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #0A0A0A', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
            <Loader2 size={24} color={B.s} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F1ECE2', borderBottom: '1px solid #0A0A0A' }}>
                {['المتجر', 'الرابط', 'المشاهدات', 'النقرات', 'التحويلات', 'معدل CVR', 'الويدجت'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: B.p, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: '#8A8478' }}>لا يوجد متاجر</td></tr>
              ) : stats.map((s, idx) => {
                const cvr = s.clicks > 0 ? ((s.conversions / s.clicks) * 100).toFixed(1) : '—';
                return (
                  <tr key={s.storeId} style={{ borderTop: '1px solid #F1ECE2', background: idx % 2 === 0 ? '#fff' : '#FFFFFF' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: B.p }}>{s.storeName}</td>
                    <td style={{ padding: '12px 16px', color: '#8A8478', fontFamily: 'monospace', fontSize: 11 }}>{s.slug}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Eye size={13} color="#8A8478" />
                        <span style={{ color: '#4A463F' }}>{s.impressions.toLocaleString('en')}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MousePointerClick size={13} color="#FF6B00" />
                        <span style={{ color: '#4A463F' }}>{s.clicks.toLocaleString('en')}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShoppingBag size={13} color="#00A651" />
                        <span style={{ color: '#4A463F' }}>{s.conversions.toLocaleString('en')}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 600, color: cvr !== '—' && parseFloat(cvr) > 5 ? '#00A651' : '#4A463F' }}>
                        {cvr}{cvr !== '—' ? '%' : ''}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => toggleWidget(s.storeId, s.widgetEnabled)}
                        disabled={toggling[s.storeId]}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {toggling[s.storeId] ? (
                          <Loader2 size={20} color="#8A8478" style={{ animation: 'spin 1s linear infinite' }} />
                        ) : s.widgetEnabled ? (
                          <ToggleRight size={24} color={B.a} />
                        ) : (
                          <ToggleLeft size={24} color="#8A8478" />
                        )}
                        <span style={{ fontSize: 12, fontWeight: 600, color: s.widgetEnabled ? B.a : '#8A8478' }}>
                          {s.widgetEnabled ? 'مفعّل' : 'موقوف'}
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Integration guide */}
      <div style={{ marginTop: 24, background: B.p, borderRadius: 10, padding: 20, fontSize: 13 }}>
        <p style={{ color: 'rgba(255,255,255,.5)', fontFamily: 'monospace', marginBottom: 8 }}>{'<!-- مثال على كود التضمين -->'}</p>
        <pre style={{ color: '#86EFAC', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, overflowX: 'auto', margin: 0 }}>{`<div data-storebuilder data-store="your-slug" data-theme="light"></div>\n<script src="${origin}/widget.js"></script>`}</pre>
        <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, marginTop: 12, marginBottom: 0 }}>يحصل التجار على كود التضمين الخاص بهم من لوحة التحكم → إعدادات الويدجت.</p>
      </div>
    </div>
  );
}
