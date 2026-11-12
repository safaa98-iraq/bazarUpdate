'use client';

import { useT } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { Gift, Users, Star, TrendingUp, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type Rule = {
  id: string; storeId: string | null; storeName: string | null;
  eventType: string; pointsPerUnit: number; multiplier: number;
  minOrderAmount: number | null; isActive: boolean;
};

type Account = {
  id: string; customerEmail: string; totalPoints: number;
  lifetimePoints: number; tier: string;
};

type LoyaltyAnalytics = {
  totalAccounts: number; totalPointsOutstanding: number; totalPointsEverEarned: number;
  tiers: { PLATINUM: number; GOLD: number; SILVER: number; BRONZE: number };
  totalEarned: number; totalRedeemed: number; totalBonus: number;
};

const TIER_COLORS = {
  BRONZE: '#cd7f32', SILVER: '#9e9e9e', GOLD: '#ffc107', PLATINUM: '#4fc3f7',
};

type Tab = 'overview' | 'rules' | 'accounts' | 'bonus';

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function AdminLoyaltyPage() {
  const t = useT();
  useDocumentTitle(t("برنامج الولاء"));
  const [tab, setTab] = useState<Tab>('overview');
  const [analytics, setAnalytics] = useState<LoyaltyAnalytics | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [ruleForm, setRuleForm] = useState({ eventType: 'purchase', pointsPerUnit: '1', multiplier: '1', minOrderAmount: '' });
  const [bonusForm, setBonusForm] = useState({ email: '', points: '', description: '' });
  const [bonusMsg, setBonusMsg] = useState('');

  async function load(t: Tab = tab) {
    setLoading(true);
    try {
      if (t === 'overview') {
        const r = await apiFetch<{ success: boolean; data: LoyaltyAnalytics }>('/api/loyalty/admin/analytics');
        setAnalytics(r.data);
      } else if (t === 'rules') {
        const r = await apiFetch<{ success: boolean; data: Rule[] }>('/api/loyalty/admin/rules');
        setRules(r.data ?? []);
      } else if (t === 'accounts') {
        const params = search ? `?search=${encodeURIComponent(search)}` : '';
        const r = await apiFetch<{ success: boolean; data: Account[] }>(`/api/loyalty/admin/accounts${params}`);
        setAccounts(r.data ?? []);
      }
    } catch { /* */ }
    setLoading(false);
  }

  useEffect(() => { load(tab); }, [tab]);

  async function toggleRule(rule: Rule) {
    await apiFetch(`/api/loyalty/admin/rules/${rule.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    load();
  }

  async function deleteRule(id: string) {
    if (!confirm(t("حذف هذه القاعدة؟"))) return;
    await apiFetch(`/api/loyalty/admin/rules/${id}`, { method: 'DELETE' });
    load();
  }

  async function createRule() {
    await apiFetch('/api/loyalty/admin/rules', {
      method: 'POST',
      body: JSON.stringify({
        eventType: ruleForm.eventType,
        pointsPerUnit: Number(ruleForm.pointsPerUnit),
        multiplier: Number(ruleForm.multiplier),
        minOrderAmount: ruleForm.minOrderAmount ? Number(ruleForm.minOrderAmount) : undefined,
      }),
    });
    setRuleForm({ eventType: 'purchase', pointsPerUnit: '1', multiplier: '1', minOrderAmount: '' });
    load();
  }

  async function giveBonus() {
    if (!bonusForm.email || !bonusForm.points) return;
    try {
      await apiFetch('/api/loyalty/admin/bonus', {
        method: 'POST',
        body: JSON.stringify({ email: bonusForm.email, points: Number(bonusForm.points), description: bonusForm.description }),
      });
      setBonusMsg(t("تمت إضافة {0} نقطة لـ {1}", [bonusForm.points, bonusForm.email]));
      setBonusForm({ email: '', points: '', description: '' });
      setTimeout(() => setBonusMsg(''), 4000);
    } catch (e: unknown) {
      setBonusMsg(e instanceof Error ? e.message : t("حدث خطأ"));
    }
  }

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: t("نظرة عامة"), icon: TrendingUp },
    { key: 'rules', label: t("قواعد النقاط"), icon: Star },
    { key: 'accounts', label: t("حسابات العملاء"), icon: Users },
    { key: 'bonus', label: t("منح نقاط"), icon: Gift },
  ];

  return (
    <div style={{ padding: 32 }} dir="rtl">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0B3550', margin: 0 }}>{t("برنامج الولاء")}</h1>
        <p style={{ fontSize: 13, color: '#5B6B7B', margin: '4px 0 0' }}>{t("إدارة نقاط الولاء والمستويات والمكافآت")}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #E6ECF1' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 13, fontWeight: 600, border: 'none', borderBottom: tab === t.key ? '2px solid #20A9F4' : '2px solid transparent', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1, color: tab === t.key ? '#20A9F4' : '#5B6B7B', transition: 'all .15s' }}>
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && analytics && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: t("إجمالي الحسابات"), value: analytics.totalAccounts, fmt: (v: number) => v.toLocaleString('en') },
              { label: t("نقاط قائمة"), value: analytics.totalPointsOutstanding, fmt: (v: number) => v.toLocaleString('en') },
              { label: t("نقاط مكتسبة"), value: analytics.totalEarned, fmt: (v: number) => v.toLocaleString('en') },
              { label: t("نقاط مستبدلة"), value: analytics.totalRedeemed, fmt: (v: number) => v.toLocaleString('en') },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                <p className="text-xl font-bold text-gray-800">{card.fmt(card.value)}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">{t("توزيع المستويات")}</h3>
            <div className="grid grid-cols-4 gap-3">
              {(Object.entries(analytics.tiers) as [keyof typeof analytics.tiers, number][]).map(([tier, count]) => (
                <div key={tier} className="text-center p-3 rounded-xl border" style={{ borderColor: TIER_COLORS[tier] + '44', background: TIER_COLORS[tier] + '11' }}>
                  <p className="text-xl font-bold mb-1" style={{ color: TIER_COLORS[tier] }}>{count}</p>
                  <p className="text-xs text-gray-500">
                    {tier === 'BRONZE' ? t("برونزي") : tier === 'SILVER' ? t("فضي") : tier === 'GOLD' ? t("ذهبي") : t("بلاتيني")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rules */}
      {tab === 'rules' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
            {loading ? <div className="py-8 text-center"><div className="h-8 w-32 bg-gray-100 rounded mx-auto animate-pulse" /></div>
            : rules.length === 0 ? <div className="py-8 text-center text-gray-400 text-sm">{t("لا توجد قواعد")}</div>
            : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 text-right">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("نوع الحدث")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("نقاط/1000 د.ع")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("المضاعف")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("المتجر")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("الحالة")}</th>
                  <th className="px-4 py-3" />
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {rules.map(r => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-medium">{r.eventType}</td>
                      <td className="px-4 py-3">{r.pointsPerUnit}</td>
                      <td className="px-4 py-3">{r.multiplier}x</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{r.storeName ?? t("عام")}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleRule(r)} className="flex items-center gap-1 text-xs font-medium transition"
                          style={{ color: r.isActive ? '#22B07D' : '#A3B0BC' }}>
                          {r.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                          {r.isActive ? t("مُفعّل") : t("موقوف")}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteRule(r.id)} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Plus className="h-4 w-4" /> {' '}{t("إضافة قاعدة")}</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("نوع الحدث")}</label>
                <select value={ruleForm.eventType} onChange={e => setRuleForm(f => ({ ...f, eventType: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none">
                  <option value="purchase">{t("شراء")}</option>
                  <option value="signup">{t("تسجيل")}</option>
                  <option value="review">{t("مراجعة")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("نقاط لكل 1000 د.ع")}</label>
                <input value={ruleForm.pointsPerUnit} onChange={e => setRuleForm(f => ({ ...f, pointsPerUnit: e.target.value }))}
                  type="number" min={0} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("المضاعف")}</label>
                <input value={ruleForm.multiplier} onChange={e => setRuleForm(f => ({ ...f, multiplier: e.target.value }))}
                  type="number" step={0.1} min={0.1} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("الحد الأدنى للطلب")}</label>
                <input value={ruleForm.minOrderAmount} onChange={e => setRuleForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                  type="number" placeholder={t("اختياري")} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" />
              </div>
            </div>
            <button onClick={createRule} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#0B3550' }}>
              
              {t("إضافة قاعدة")}
            </button>
          </div>
        </div>
      )}

      {/* Accounts */}
      {tab === 'accounts' && (
        <div>
          <div className="flex gap-2 mb-4">
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
              placeholder={t("البحث بالبريد الإلكتروني...")}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" />
            <button onClick={() => load()} className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> {' '}{t("بحث")}
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? <div className="py-8 text-center"><div className="h-8 w-32 bg-gray-100 rounded mx-auto animate-pulse" /></div>
            : accounts.length === 0 ? <div className="py-8 text-center text-gray-400 text-sm">{t("لا توجد حسابات")}</div>
            : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 text-right">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("البريد الإلكتروني")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("النقاط")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("المستوى")}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("إجمالي الكسب")}</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {accounts.map(a => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 font-medium">{a.customerEmail}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: '#0B3550' }}>{a.totalPoints.toLocaleString('en')}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ color: TIER_COLORS[a.tier as keyof typeof TIER_COLORS], background: TIER_COLORS[a.tier as keyof typeof TIER_COLORS] + '22' }}>
                          {a.tier === 'BRONZE' ? t("برونزي") : a.tier === 'SILVER' ? t("فضي") : a.tier === 'GOLD' ? t("ذهبي") : t("بلاتيني")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{a.lifetimePoints.toLocaleString('en')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Bonus */}
      {tab === 'bonus' && (
        <div className="max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Gift className="h-4 w-4" style={{ color: '#20A9F4' }} />
              
              {t("منح نقاط مكافأة")}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("البريد الإلكتروني *")}</label>
                <input value={bonusForm.email} onChange={e => setBonusForm(f => ({ ...f, email: e.target.value }))}
                  type="email" placeholder="customer@example.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("عدد النقاط *")}</label>
                <input value={bonusForm.points} onChange={e => setBonusForm(f => ({ ...f, points: e.target.value }))}
                  type="number" min={1} placeholder="100"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t("الوصف")}</label>
                <input value={bonusForm.description} onChange={e => setBonusForm(f => ({ ...f, description: e.target.value }))}
                  placeholder={t("نقاط مكافأة لـ...")}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" />
              </div>
              {bonusMsg && (
                <p className={`text-sm p-2 rounded-lg ${bonusMsg.includes(t("تمت")) ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {bonusMsg}
                </p>
              )}
              <button onClick={giveBonus}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: '#20A9F4' }}>
                
                {t("منح النقاط")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
