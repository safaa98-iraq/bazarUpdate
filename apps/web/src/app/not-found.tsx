import Link from 'next/link';
import { Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-tajawal)', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center', color: '#007AFF' }}><Search size={88} strokeWidth={1.5} /></div>
        <h1 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 'clamp(28px, 5vw, 48px)', color: '#1C1C1E', margin: '0 0 16px' }}>
          الصفحة غير موجودة
        </h1>
        <p style={{ fontSize: 16, color: '#8E8E93', marginBottom: 36, lineHeight: 1.75 }}>
          الرابط الذي طلبته غير موجود أو تم نقله.<br />
          تحقق من الرابط أو عُد إلى الصفحة الرئيسية.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ padding: '13px 28px', background: 'linear-gradient(135deg, #0A84FF, #5E5CE6)', color: '#fff', fontWeight: 700, fontSize: 15, borderRadius: 10, textDecoration: 'none', boxShadow: '0 6px 20px rgba(174,68,90,.25)' }}>
            الصفحة الرئيسية
          </Link>
          <Link href="/dashboard" style={{ padding: '13px 28px', background: '#fff', border: '1.5px solid #E5F1FF', color: '#1C1C1E', fontWeight: 700, fontSize: 15, borderRadius: 10, textDecoration: 'none' }}>
            لوحة التحكم
          </Link>
        </div>
      </div>
    </div>
  );
}
