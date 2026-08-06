'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Gift, Copy, Users, Calendar, Check } from 'lucide-react';
import { PLAN_LABELS } from '@/lib/plan-features';
import { trackPage } from '@/lib/track';
import type { ReferralStats } from '@storebuilder/types';

const B = { p: '#2F2E4B', a: '#DB6E93', border: '#ECE6F0', bg: '#F5EFFA' };

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function ReferralsPage() {
  useDocumentTitle('ادعُ واربح');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => { trackPage('referrals'); }, []);

  useEffect(() => {
    api.get<{ success: boolean; data: ReferralStats }>('/api/auth/referrals')
      .then(r => setStats(r.data))
      .catch(() => toast.error('فشل تحميل بيانات الإحالة'))
      .finally(() => setLoading(false));
  }, []);

  const copyLink = () => {
    if (!stats) return;
    navigator.clipboard.writeText(stats.referralLink);
    setCopied(true);
    toast.success('تم نسخ رابط الدعوة');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="p-8 space-y-4 max-w-2xl mx-auto">
      {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: '#ECE6F0' }} />)}
    </div>
  );

  if (!stats) return null;

  return (
    <div className="p-6 max-w-2xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${B.a}15` }}>
          <Gift className="h-5 w-5" style={{ color: B.a }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: B.p }}>ادعُ تجاراً واربح</h1>
          <p className="text-sm text-gray-500">اربح شهراً مجانياً عن كل تاجر تدعوه يشترك بخطة مدفوعة ويجدّدها مرتين</p>
        </div>
      </div>

      <div className="rounded-2xl p-6 mb-5 text-white" style={{ background: `linear-gradient(135deg, ${B.p}, ${B.a})` }}>
        <p className="text-sm opacity-80 mb-1">رابط دعوتك الخاص</p>
        <div className="flex items-center gap-2 bg-white/10 rounded-xl p-3">
          <span className="flex-1 text-sm font-mono truncate" dir="ltr">{stats.referralLink}</span>
          <button onClick={copyLink} className="w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center bg-white/15 hover:bg-white/25 transition">
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </div>
        <p className="text-xs opacity-70 mt-2">أو شارك كودك مباشرة: <span className="font-mono font-bold">{stats.referralCode}</span></p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border p-5 text-center" style={{ borderColor: B.border }}>
          <Users size={20} className="mx-auto mb-2" style={{ color: B.a }} />
          <p className="text-2xl font-bold" style={{ color: B.p }}>{stats.totalReferred}</p>
          <p className="text-xs text-gray-400">تاجر مدعو</p>
        </div>
        <div className="bg-white rounded-2xl border p-5 text-center" style={{ borderColor: B.border }}>
          <Gift size={20} className="mx-auto mb-2" style={{ color: B.a }} />
          <p className="text-2xl font-bold" style={{ color: B.p }}>{stats.freeMonthsCredit}</p>
          <p className="text-xs text-gray-400">شهر مجاني مكتسب</p>
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-6 text-sm leading-relaxed" style={{ background: B.bg, border: `1px solid ${B.border}` }}>
        <p className="font-semibold mb-1" style={{ color: B.p }}>كيف يعمل؟</p>
        <ul className="space-y-1 text-gray-600 list-disc list-inside text-xs">
          <li>شارك رابطك مع تجار تعرفهم</li>
          <li>عندما يسجّلون عبر رابطك ويشتركون بخطة مدفوعة، ثم يجدّدونها للمرة الثانية، تربح أنت شهراً مجانياً</li>
          <li>لا حد لعدد التجار الذين يمكنك دعوتهم</li>
        </ul>
      </div>

      {stats.referrals.length > 0 && (
        <div className="rounded-2xl overflow-hidden bg-white border" style={{ borderColor: B.border }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: B.border }}>
            <p className="text-sm font-bold" style={{ color: B.p }}>التجار الذين دعوتهم</p>
          </div>
          {stats.referrals.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: i < stats.referrals.length - 1 ? `1px solid ${B.border}` : 'none' }}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: B.p }}>{r.name}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={11} /> {new Date(r.joinedAt).toLocaleDateString('ar-IQ')}</p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: B.bg, color: B.p }}>{PLAN_LABELS[r.plan]}</span>
              {r.rewardGiven && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: '#DCEEDA', color: '#3D7C56' }}>مكتمل</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
