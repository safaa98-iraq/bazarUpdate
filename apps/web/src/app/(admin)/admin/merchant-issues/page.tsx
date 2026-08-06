'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { AlertTriangle, Store, Package, TrendingDown, Ban, Clock, MessageCircle } from 'lucide-react';
import type { MerchantIssue, MerchantIssueType } from '@storebuilder/types';

const B = { p: '#2F2E4B', a: '#DB6E93', border: '#ECE6F0', bg: '#F5EFFA' };

const ISSUE_META: Record<MerchantIssueType, { label: string; icon: typeof Store; bg: string; color: string }> = {
  NO_STORE: { label: 'بلا متجر', icon: Store, bg: '#FEF3C7', color: '#92400E' },
  NO_PRODUCTS: { label: 'بلا منتجات', icon: Package, bg: '#FEF3C7', color: '#92400E' },
  NO_SALES: { label: 'بلا مبيعات', icon: TrendingDown, bg: '#FEE2E2', color: '#991B1B' },
  SUSPENDED: { label: 'موقوف', icon: Ban, bg: '#FEE2E2', color: '#991B1B' },
  PAYMENT_PENDING: { label: 'دفع بانتظار المراجعة', icon: Clock, bg: '#DBEAFE', color: '#1E40AF' },
};

const FILTERS: { value: MerchantIssueType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'الكل' },
  { value: 'NO_STORE', label: 'بلا متجر' },
  { value: 'NO_PRODUCTS', label: 'بلا منتجات' },
  { value: 'NO_SALES', label: 'بلا مبيعات' },
  { value: 'SUSPENDED', label: 'موقوف' },
  { value: 'PAYMENT_PENDING', label: 'دفع معلّق' },
];

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function MerchantIssuesPage() {
  useDocumentTitle('تجار بحاجة متابعة');
  const [issues, setIssues] = useState<MerchantIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MerchantIssueType | 'ALL'>('ALL');

  useEffect(() => {
    apiFetch<{ success: boolean; data: MerchantIssue[] }>('/api/admin/merchant-issues')
      .then(r => setIssues(r.data ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? issues : issues.filter(i => i.issueType === filter);
  const counts = FILTERS.reduce<Record<string, number>>((acc, f) => {
    acc[f.value] = f.value === 'ALL' ? issues.length : issues.filter(i => i.issueType === f.value).length;
    return acc;
  }, {});

  if (loading) return (
    <div className="p-8 space-y-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: '#ECE6F0' }} />)}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#FEF3C7' }}>
          <AlertTriangle className="h-5 w-5" style={{ color: '#92400E' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: B.p }}>تجار بحاجة متابعة</h1>
          <p className="text-sm text-gray-500">إشارات تلقائية على تجار قد يحتاجون دعماً — لا مبيعات، بلا منتجات، دفع معلّق، أو متجر موقوف</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition"
            style={{ background: filter === f.value ? B.p : '#fff', color: filter === f.value ? '#fff' : B.p, border: `1px solid ${filter === f.value ? B.p : B.border}` }}>
            {f.label}
            <span className="text-xs opacity-70">({counts[f.value] ?? 0})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl p-10 text-center bg-white border-2 border-dashed" style={{ borderColor: B.border }}>
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-30" style={{ color: B.p }} />
          <p className="font-semibold text-gray-500">لا توجد إشارات حالياً — كل شيء يبدو بخير</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden bg-white border" style={{ borderColor: B.border }}>
          {filtered.map((issue, i) => {
            const meta = ISSUE_META[issue.issueType];
            const Icon = meta.icon;
            return (
              <div key={`${issue.merchantId}-${issue.issueType}-${i}`} className="flex items-center gap-3 px-5 py-3.5"
                style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${B.border}` : 'none' }}>
                <span className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: meta.bg, color: meta.color }}>
                  <Icon size={14} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate" style={{ color: B.p }}>{issue.merchantName}</p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{issue.detail}{issue.storeName ? ` — ${issue.storeName}` : ''}</p>
                  <p className="text-xs text-gray-300">{new Date(issue.since).toLocaleDateString('ar-IQ')}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {issue.merchantWhatsapp && (
                    <a href={`https://wa.me/${issue.merchantWhatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer"
                      className="w-8 h-8 rounded-xl flex items-center justify-center border transition hover:bg-green-50" style={{ borderColor: B.border }} title="تواصل واتساب">
                      <MessageCircle size={14} className="text-green-500" />
                    </a>
                  )}
                  <Link href="/admin/merchants" title={issue.merchantEmail}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl transition" style={{ background: B.bg, color: B.p }}>
                    عرض
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
