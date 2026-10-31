'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Search } from 'lucide-react';

const B = { p: '#1C1C1E', s: '#3A3A3C', a: '#007AFF', soft: '#E5F1FF' };

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
  MERCHANT_DELETED:     { bg: '#FFE9E7', color: '#D70015' },
  MERCHANT_DEACTIVATED: { bg: '#FFF9DB', color: '#A05A00' },
  STORE_DISABLED:       { bg: '#FFF9DB', color: '#A05A00' },
  STORE_SUSPENDED:      { bg: '#FFE9E7', color: '#D70015' },
  MERCHANT_ACTIVATED:   { bg: '#E3F9E8', color: '#248A3D' },
  STORE_ENABLED:        { bg: '#E3F9E8', color: '#248A3D' },
  STORE_UNSUSPENDED:    { bg: '#E3F9E8', color: '#248A3D' },
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
        <p style={{ fontSize: 13, color: '#6C6C70', margin: '4px 0 0' }}>{total} إجراء مسجّل</p>
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#AEAEB2' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="فلتر حسب نوع الإجراء..."
          style={{ width: '100%', padding: '9px 36px 9px 12px', border: '1.5px solid #E5E5EA', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4,5].map(i => <div key={i} style={{ height: 56, background: '#E5E5EA', borderRadius: 10 }} />)}
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#AEAEB2', fontSize: 14 }}>لا يوجد سجلات</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E5E5EA', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {logs.map((log, idx) => {
              const st = ACTION_STYLES[log.action] ?? { bg: '#EFEFF4', color: B.s };
              const label = ACTION_LABELS[log.action] ?? log.action.replace(/_/g, ' ');
              return (
                <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 20px', borderBottom: idx < logs.length - 1 ? '1px solid #F2F2F7' : 'none', background: idx % 2 === 0 ? '#fff' : '#FFFFFF' }}>
                  <div style={{ flexShrink: 0, marginTop: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10, background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: B.p }}>{log.admin.name}</span>
                      <span style={{ color: '#D1D1D6' }}>·</span>
                      <span style={{ color: '#6C6C70' }}>
                        {log.targetType} <span style={{ fontFamily: 'monospace', fontSize: 11 }}>#{log.targetId.slice(-8)}</span>
                      </span>
                    </div>
                    {log.details && (
                      <p style={{ fontSize: 11, color: '#AEAEB2', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: '#AEAEB2', flexShrink: 0 }}>{formatDateTime(log.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
