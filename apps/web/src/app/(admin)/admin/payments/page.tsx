'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { PLAN_CONFIGS } from '@storebuilder/types';
import { Clock, CheckCircle2, XCircle, Eye, Check, X, RefreshCw, Loader2, Phone, AlertTriangle, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

const C = {
  bg: '#F6F8FA', bgAlt: '#FFFFFF', p: '#0B3550', s: '#32506A',
  a: '#20A9F4', text: '#0B3550', muted: '#7A8A99', border: '#E3F5FE',
};

const STATUS_META: Record<string, { label: string; bg: string; color: string; Icon: typeof Clock }> = {
  PENDING:  { label: 'قيد المراجعة', bg: '#FEF3E2', color: '#F59E0B', Icon: Clock },
  APPROVED: { label: 'مقبول',        bg: '#F0FBF6', color: '#22B07D', Icon: CheckCircle2 },
  REJECTED: { label: 'مرفوض',        bg: '#FEF5F5', color: '#F04F4F', Icon: XCircle },
};

const planMeta = (plan: string) => PLAN_CONFIGS[plan as keyof typeof PLAN_CONFIGS];
const CYCLE_AR: Record<string, string> = { MONTHLY: 'شهري', YEARLY: 'سنوي', LIFETIME: 'أبدي — دفعة واحدة', LIFETIME_INSTALLMENT: 'أبدي بالتقسيط', LIFETIME_UPGRADE: 'ترقية أبدي (الفرق)' };

/** What this request pays for: cycle, installment, amount and how it was paid. */
function RequestPrice({ r, align = 'left' }: { r: { cycle?: string; installment?: number | null; method?: string | null; priceNote?: string | null; amount: number | string }; align?: 'left' | 'right' }) {
  return (
    <div style={{ textAlign: align, fontSize: 12, lineHeight: 1.7 }}>
      <div style={{ fontWeight: 900, fontSize: 16, color: '#0B3550' }}>{Number(r.amount).toLocaleString('en')} د.ع</div>
      <div style={{ color: '#32506A', fontWeight: 700 }}>{CYCLE_AR[r.cycle ?? 'MONTHLY'] ?? r.cycle}{r.installment ? ` — الدفعة ${r.installment} من 3` : ''}</div>
      <div style={{ color: '#7A8A99' }}>{r.method === 'ZAINCASH' ? 'ZainCash' : 'تحويل مصرفي'}</div>
      {r.priceNote && <div style={{ color: '#22B07D', fontWeight: 600 }}>{r.priceNote}</div>}
    </div>
  );
}

interface PayRequest {
  id: string;
  userId: string;
  planTarget: string;
  cycle?: string;
  installment?: number | null;
  method?: string | null;
  priceNote?: string | null;
  amount: number;
  currency: string;
  status: string;
  txRef: string;
  proofUrl: string | null;
  adminNote: string | null;
  createdAt: string;
  user: { name: string; email: string; phone: string | null };
}

function ActionModal({ req, onClose, onDone }: { req: PayRequest; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [showProof, setShowProof] = useState(false);

  const act = async (action: 'APPROVE' | 'REJECT') => {
    setLoading(action === 'APPROVE' ? 'approve' : 'reject');
    try {
      await api.patch(`/api/billing/admin/requests/${req.id}`, { action, adminNote: note || undefined });
      toast.success(action === 'APPROVE' ? '✓ تم الموافقة وترقية خطة المستخدم' : '✓ تم رفض الطلب');
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل الإجراء');
    } finally { setLoading(null); }
  };

  const proofSrc = req.proofUrl ? (req.proofUrl.startsWith('http') ? req.proofUrl : `http://localhost:4000${req.proofUrl}`) : null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,5,20,.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bgAlt, borderRadius: 10, width: '100%', maxWidth: 520, boxShadow: '0 40px 100px rgba(0,0,0,.3)', overflow: 'hidden' }}>
        <div style={{ background: `linear-gradient(135deg,${C.p},${C.s})`, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: '#fff', fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 16 }}>مراجعة طلب الدفع</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* User info */}
          <div style={{ background: C.bg, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{req.user.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{req.user.email}</div>
                {req.user.phone && (
                  <a
                    href={`tel:${req.user.phone}`}
                    target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, color: '#25D366', fontSize: 12, fontWeight: 700, textDecoration: 'none', background: '#F0FBF6', padding: '3px 10px', borderRadius: 99, border: '1px solid #BDEFD9' }}
                  >
                    <Phone size={14} />
                    الهاتف: {req.user.phone}
                  </a>
                )}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.p }}>{planMeta(req.planTarget)?.nameAr ?? req.planTarget}</div>
                <div style={{ marginTop: 6 }}>
                  <RequestPrice r={req} />
                </div>
              </div>
            </div>
          </div>

          {/* Transaction ref */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>رقم المرجع البنكي</label>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontFamily: 'monospace', fontSize: 14, color: C.text, letterSpacing: '.5px', userSelect: 'all' }}>
              {req.txRef}
            </div>
          </div>

          {/* Proof image */}
          {proofSrc && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>صورة الإيصال</label>
              {showProof ? (
                <div style={{ position: 'relative', width: '100%', height: 200, borderRadius: 10, overflow: 'hidden', cursor: 'pointer' }} onClick={() => window.open(proofSrc, '_blank')}>
                  <Image src={proofSrc} alt="proof" fill style={{ objectFit: 'cover' }} unoptimized />
                </div>
              ) : (
                <button onClick={() => setShowProof(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', fontSize: 13, color: C.p, fontFamily: 'inherit', fontWeight: 600 }}>
                  <Eye size={15} /> عرض صورة الإيصال
                </button>
              )}
            </div>
          )}

          {!proofSrc && (
            <div style={{ marginBottom: 16, background: '#FEF9E3', border: '1px solid #FDE047', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#713F12', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} />
              المستخدم لم يرفع صورة إيصال — تحقق يدوياً من حسابك البنكي
            </div>
          )}

          {/* Date */}
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
            تاريخ الطلب: {new Date(req.createdAt).toLocaleString('ar-IQ')}
          </div>

          {/* Admin note */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>ملاحظة للمستخدم (اختياري عند الرفض)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="سبب الرفض أو أي ملاحظة..."
              style={{ width: '100%', padding: '10px 14px', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: 'inherit', color: C.text, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => act('APPROVE')} disabled={!!loading}
              style={{ flex: 1, padding: '13px 0', background: loading === 'approve' ? 'rgba(5,150,105,.4)' : '#22B07D', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
              {loading === 'approve' ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
              موافقة وترقية
            </button>
            <button onClick={() => act('REJECT')} disabled={!!loading}
              style={{ flex: 1, padding: '13px 0', background: loading === 'reject' ? 'rgba(220,38,38,.35)' : '#F04F4F', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
              {loading === 'reject' ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={16} />}
              رفض
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function AdminPaymentsPage() {
  useDocumentTitle('طلبات الدفع');
  const [requests, setRequests] = useState<PayRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'ALL' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [selected, setSelected] = useState<PayRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: PayRequest[] }>(`/api/billing/admin/requests?status=${filter}`);
      setRequests(res.data ?? []);
    } catch { toast.error('فشل تحميل الطلبات'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div style={{ padding: '32px 20px', maxWidth: 1100, margin: '0 auto', fontFamily: 'var(--font-tajawal)' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {selected && <ActionModal req={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); load(); }} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 'clamp(20px, 3vw, 28px)', color: C.text, margin: '0 0 4px' }}>
            طلبات الدفع
            {pendingCount > 0 && filter === 'PENDING' && (
              <span style={{ marginRight: 12, background: C.a, color: '#fff', fontSize: 13, fontWeight: 700, padding: '2px 12px', borderRadius: 99 }}>{pendingCount}</span>
            )}
          </h1>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>راجع طلبات الترقية وتحقق من مدفوعات QR</p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', fontSize: 13, color: C.p, fontFamily: 'inherit', fontWeight: 600 }}>
          <RefreshCw size={15} />
          تحديث
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {([['PENDING', 'قيد المراجعة'], ['APPROVED', 'مقبول'], ['REJECTED', 'مرفوض'], ['ALL', 'الكل']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{ padding: '8px 18px', borderRadius: 10, border: `1.5px solid ${filter === key ? C.p : C.border}`, background: filter === key ? C.p : 'transparent', color: filter === key ? '#fff' : C.muted, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Loader2 size={36} color={C.p} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: C.muted }}>
          <Clock size={48} strokeWidth={1} color={C.border} style={{ marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>لا توجد طلبات {filter === 'PENDING' ? 'معلقة' : ''}</div>
        </div>
      ) : (
        <div style={{ background: C.bgAlt, border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {['المستخدم', 'الخطة المطلوبة', 'رقم المرجع', 'إيصال', 'الحالة', 'التاريخ', 'إجراء'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'right', color: C.muted, fontWeight: 600, whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((r, i) => {
                  const sm = STATUS_META[r.status] ?? STATUS_META.PENDING;
                  const Icon = sm.Icon;
                  return (
                    <tr key={r.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? '#FAFAFE' : C.bgAlt }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: C.text }}>{r.user.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{r.user.email}</div>
                        {r.user.phone && (
                          <a href={`tel:${r.user.phone}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 3, color: '#25D366', fontSize: 10, fontWeight: 700, textDecoration: 'none' }}>
                            <Phone size={10} /> {r.user.phone}
                          </a>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: C.p }}>{planMeta(r.planTarget)?.nameAr ?? r.planTarget}</div>
                        <div style={{ marginTop: 6 }}>
                          <RequestPrice r={r} />
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: C.muted, fontSize: 12 }}>{r.txRef}</td>
                      <td style={{ padding: '14px 16px' }}>
                        {r.proofUrl ? (
                          <a href={r.proofUrl.startsWith('http') ? r.proofUrl : `http://localhost:4000${r.proofUrl}`} target="_blank" rel="noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: C.p, fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
                            <Eye size={13} /> عرض
                          </a>
                        ) : <span style={{ color: C.muted, fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: sm.bg, color: sm.color, padding: '4px 10px', borderRadius: 99, fontWeight: 700, fontSize: 11 }}>
                          <Icon size={11} />{sm.label}
                        </div>
                        {r.adminNote && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{r.adminNote}</div>}
                      </td>
                      <td style={{ padding: '14px 16px', color: C.muted, whiteSpace: 'nowrap', fontSize: 12 }}>
                        {new Date(r.createdAt).toLocaleDateString('ar-IQ')}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {r.status === 'PENDING' ? (
                          <button onClick={() => setSelected(r)}
                            style={{ padding: '7px 14px', background: C.p, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                            مراجعة
                          </button>
                        ) : <span style={{ fontSize: 12, color: C.muted }}>تمت المعالجة</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Instructions for admin */}
      <div style={{ marginTop: 28, background: '#FEF9E3', border: '1px solid #FDE047', borderRadius: 10, padding: '16px 20px', fontSize: 13, color: '#713F12', lineHeight: 1.8 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><Lightbulb size={14} /> كيف تتحقق من الدفع؟</div>
        <ol style={{ margin: 0, paddingRight: 20, lineHeight: 2 }}>
          <li>افتح تطبيق بنكك وتحقق من وجود حوالة بالمبلغ المطلوب</li>
          <li>طابق رقم المرجع الذي أرسله المستخدم مع رقم العملية في حسابك</li>
          <li>اضغط &quot;موافقة وترقية&quot; إذا تطابقت البيانات — سيتم تفعيل خطته فوراً</li>
          <li>اضغط &quot;رفض&quot; مع ذكر السبب إذا لم تجد الحوالة</li>
        </ol>
      </div>
    </div>
  );
}
