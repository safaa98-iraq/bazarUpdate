'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Search } from 'lucide-react';

const B = { p: '#2F2E4B', s: '#4A4767', a: '#DB6E93', soft: '#FBE1EA' };

interface LogEntry {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown> | null;
  storeId: string | null;
  createdAt: string;
  admin: { name: string; email: string };
}

const ACTION_STYLES: Record<string, { bg: string; color: string }> = {
  MERCHANT_DELETED:     { bg: '#FEE2E2', color: '#991B1B' },
  MERCHANT_DEACTIVATED: { bg: '#FEF9C3', color: '#854D0E' },
  STORE_DISABLED:       { bg: '#FEF9C3', color: '#854D0E' },
  STORE_SUSPENDED:      { bg: '#FEE2E2', color: '#991B1B' },
  MERCHANT_ACTIVATED:   { bg: '#D1FAE5', color: '#065F46' },
  STORE_ENABLED:        { bg: '#D1FAE5', color: '#065F46' },
  STORE_UNSUSPENDED:    { bg: '#D1FAE5', color: '#065F46' },
};

const ACTION_LABELS: Record<string, string> = {
  MERCHANT_DELETED:     'حذف تاجر',
  MERCHANT_DEACTIVATED: 'إيقاف تاجر',
  STORE_DISABLED:       'تعطيل متجر',
  STORE_SUSPENDED:      'إيقاف متجر',
  MERCHANT_ACTIVATED:   'تفعيل تاجر',
  STORE_ENABLED:        'تفعيل متجر',
  STORE_UNSUSPENDED:    'رفع إيقاف متجر',
  PLAN_CHANGED:         'تغيير خطة',
  EDITOR_ENTER:         'دخول محرر',
  EDITOR_EXIT:          'خروج محرر',
};

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function AdminLogsPage() {
  useDocumentTitle('سجل النشاطات');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?action=${encodeURIComponent(search)}` : '';
      const res = await api.get<{ success: boolean; data: LogEntry[]; pagination: { total: number } }>(
        `/api/admin/logs${params}`
      );
      setLogs(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch {
      toast.error('فشل تحميل السجل');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: B.p, margin: 0 }}>سجل المراقبة</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>{total} إجراء مسجّل</p>
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="فلتر حسب نوع الإجراء..."
          style={{ width: '100%', padding: '9px 36px 9px 12px', border: '1.5px solid #ECE6F0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4,5].map(i => <div key={i} style={{ height: 56, background: '#ECE6F0', borderRadius: 10 }} />)}
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF', fontSize: 14 }}>لا يوجد سجلات</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ECE6F0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {logs.map((log, idx) => {
              const st = ACTION_STYLES[log.action] ?? { bg: '#F0E7F8', color: B.s };
              const label = ACTION_LABELS[log.action] ?? log.action.replace(/_/g, ' ');
              return (
                <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 20px', borderBottom: idx < logs.length - 1 ? '1px solid #F5EFFA' : 'none', background: idx % 2 === 0 ? '#fff' : '#FDFCFE' }}>
                  <div style={{ flexShrink: 0, marginTop: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10, background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: B.p }}>{log.admin.name}</span>
                      <span style={{ color: '#D1D5DB' }}>·</span>
                      <span style={{ color: '#6B7280' }}>
                        {log.targetType} <span style={{ fontFamily: 'monospace', fontSize: 11 }}>#{log.targetId.slice(-8)}</span>
                      </span>
                    </div>
                    {log.details && (
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>{formatDateTime(log.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
