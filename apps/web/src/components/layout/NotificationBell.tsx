'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, X, Check, CheckCheck, Zap, Crown, Shield, AlertCircle, CreditCard, ChevronDown, ChevronUp,
  Store, Package, Tag, BarChart3, PartyPopper, Sparkles, Rocket, XCircle, MessageCircle, type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';

const C = { p: '#2F2E4B', s: '#4A4767', a: '#DB6E93', text: '#2F2E4B', muted: '#6B6A83', border: '#FBE1EA', bg: '#F5EFFA' };

const PLAN_ICONS: Record<string, typeof Zap> = { PRO: Zap, ENTERPRISE: Crown, FREE: Shield };
const PLAN_COLORS: Record<string, string> = { PRO: '#2F2E4B', ENTERPRISE: '#DB6E93', FREE: '#6B6A83' };

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  meta: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

interface ApprovalDetailProps { notif: Notif; onClose: () => void; }

function ApprovalModal({ notif, onClose }: ApprovalDetailProps) {
  const plan = notif.meta.plan as string ?? 'PRO';
  const planAr = notif.meta.planAr as string ?? '';
  const features = (notif.meta.features as string[]) ?? [];
  const Icon = PLAN_ICONS[plan] ?? Zap;
  const color = PLAN_COLORS[plan] ?? C.p;

  const ONBOARDING: { icon: LucideIcon; title: string; desc: string; href: string }[] = [
    { icon: Store, title: 'خصص متجرك', desc: 'اختر قالباً واضبط الألوان والشعار', href: '/dashboard/settings' },
    { icon: Package, title: 'أضف منتجاتك', desc: 'أضف منتجات غير محدودة مع الصور والوصف', href: '/dashboard/products' },
    { icon: Tag, title: 'أنشئ كوبونات', desc: 'فعّل الخصومات لجذب المزيد من العملاء', href: '/dashboard/coupons' },
    { icon: BarChart3, title: 'تابع التحليلات', desc: 'راقب المبيعات والزيارات في الوقت الفعلي', href: '/dashboard/analytics' },
  ];

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(10,5,20,.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 40px 100px rgba(0,0,0,.35)' }}
      >
        {/* Hero */}
        <div style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, padding: '32px 28px 28px', textAlign: 'center', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <X size={15} />
          </button>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', backdropFilter: 'blur(4px)' }}>
            <Icon size={36} color="#fff" strokeWidth={1.5} />
          </div>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center', color: '#fff' }}><PartyPopper size={30} /></div>
          <h2 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 22, color: '#fff', margin: '0 0 6px' }}>
            مرحباً بك في خطة {planAr}!
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', margin: 0 }}>
            تم تفعيل حسابك — استمتع بالمزايا الجديدة
          </p>
        </div>

        <div style={{ padding: '24px 28px 32px' }}>
          {/* Features unlocked */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#05966915', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={12} color="#059669" /></span>
              المزايا المفعّلة الآن
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: C.bg, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#05966920', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    <Check size={10} color="#059669" strokeWidth={3} />
                  </div>
                  <span style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Onboarding steps */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Rocket size={15} color={color} /> ابدأ الآن — خطواتك الأولى
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ONBOARDING.map(({ icon: StepIcon, title, desc, href }, i) => (
                <a key={href} href={href} onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: C.bg, borderRadius: 10, textDecoration: 'none', border: `1.5px solid ${C.border}`, transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = `${color}08`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <StepIcon size={18} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{title}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{desc}</div>
                  </div>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800 }}>
                    {i + 1}
                  </div>
                </a>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ width: '100%', padding: '14px 0', background: `linear-gradient(135deg,${color},${color}cc)`, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 8px 24px ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            ابدأ الآن <Rocket size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  return `منذ ${Math.floor(h / 24)} ي`;
}

function NotifItem({ n, onClick }: { n: Notif; onClick: (n: Notif) => void }) {
  const iconMap: Record<string, LucideIcon> = {
    PAYMENT_REQUEST: CreditCard,
    PLAN_APPROVED: PartyPopper,
    PLAN_REJECTED: XCircle,
    NEW_ORDER: Package,
    CHAT_MESSAGE: MessageCircle,
  };
  const bgMap: Record<string, string> = {
    PAYMENT_REQUEST: '#FEF3C7',
    PLAN_APPROVED: '#F0FDF4',
    PLAN_REJECTED: '#FEF2F2',
    NEW_ORDER: '#F0E7F8',
    CHAT_MESSAGE: '#FBE1EA',
  };
  const colorMap: Record<string, string> = {
    PAYMENT_REQUEST: '#D97706',
    PLAN_APPROVED: '#059669',
    PLAN_REJECTED: '#DC2626',
    NEW_ORDER: '#2F2E4B',
    CHAT_MESSAGE: '#DB6E93',
  };

  return (
    <div
      onClick={() => onClick(n)}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', cursor: 'pointer', background: n.isRead ? 'transparent' : C.bg, borderBottom: `1px solid ${C.border}`, transition: 'background .15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = '#F0EBF8'; }}
      onMouseLeave={e => { e.currentTarget.style.background = n.isRead ? 'transparent' : C.bg; }}
    >
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: bgMap[n.type] ?? '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {(() => { const NotifIcon = iconMap[n.type] ?? Bell; return <NotifIcon size={18} color={colorMap[n.type] ?? C.muted} />; })()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ fontWeight: n.isRead ? 600 : 800, fontSize: 13, color: colorMap[n.type] ?? C.text, lineHeight: 1.4 }}>{n.title}</div>
          {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.a, flexShrink: 0, marginTop: 4 }} />}
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginTop: 2 }}>{n.body}</div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
      </div>
    </div>
  );
}

export function NotificationBell({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const router = useRouter();
  const { token } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [activeModal, setActiveModal] = useState<Notif | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get<{ success: boolean; data: { notifications: Notif[]; unreadCount: number } }>('/api/notifications');
      setNotifications(res.data.notifications);
      setUnread(res.data.unreadCount);
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = async () => {
    await api.patch('/api/notifications/read-all', {});
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const handleNotifClick = async (n: Notif) => {
    if (!n.isRead) {
      await api.patch(`/api/notifications/${n.id}/read`, {});
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      setUnread(prev => Math.max(0, prev - 1));
    }
    if (n.type === 'PLAN_APPROVED') {
      setOpen(false);
      setActiveModal(n);
    } else if (n.type === 'NEW_ORDER') {
      setOpen(false);
      const orderId = n.meta.orderId as string | undefined;
      router.push(orderId ? `/dashboard/orders?highlight=${orderId}` : '/dashboard/orders');
    } else if (n.type === 'CHAT_MESSAGE') {
      setOpen(false);
      const conversationId = n.meta.conversationId as string | undefined;
      router.push(conversationId ? `/dashboard/chat?conversationId=${conversationId}` : '/dashboard/chat');
    }
  };

  const iconColor = variant === 'dark' ? 'rgba(255,255,255,.75)' : C.muted;

  return (
    <>
      {activeModal && <ApprovalModal notif={activeModal} onClose={() => setActiveModal(null)} />}

      <div ref={ref} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, transition: 'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; e.currentTarget.style.color = variant === 'dark' ? '#fff' : C.p; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = iconColor; }}
          title="الإشعارات"
        >
          <Bell size={19} strokeWidth={1.75} />
          {unread > 0 && (
            <span style={{ position: 'absolute', top: 2, left: 2, minWidth: 16, height: 16, borderRadius: 99, background: C.a, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid', borderColor: variant === 'dark' ? C.p : '#fff', lineHeight: 1 }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {open && (
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', width: 340, background: '#fff', borderRadius: 10, boxShadow: '0 20px 60px rgba(0,0,0,.18)', border: `1px solid ${C.border}`, overflow: 'hidden', zIndex: 1000, animation: 'notif-drop .2s cubic-bezier(.16,1,.3,1)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${C.border}`, background: C.bg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={15} color={C.p} />
                <span style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 14, color: C.text }}>الإشعارات</span>
                {unread > 0 && (
                  <span style={{ background: C.a, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{unread} جديد</span>
                )}
              </div>
              {unread > 0 && (
                <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: C.p, fontFamily: 'inherit', fontWeight: 600, padding: '4px 8px', borderRadius: 6 }}>
                  <CheckCheck size={13} /> قراءة الكل
                </button>
              )}
            </div>

            {/* List */}
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <Bell size={32} color={C.border} strokeWidth={1} style={{ marginBottom: 10 }} />
                  <div style={{ fontSize: 13, color: C.muted }}>لا توجد إشعارات</div>
                </div>
              ) : (
                notifications.map(n => <NotifItem key={n.id} n={n} onClick={handleNotifClick} />)
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes notif-drop { from { opacity:0; transform:translateX(-50%) translateY(-8px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }`}</style>
    </>
  );
}
