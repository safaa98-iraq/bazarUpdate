'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div style={{ minHeight: '100vh', background: '#F6F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-tajawal)', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center', color: '#20A9F4' }}><AlertTriangle size={72} strokeWidth={1.5} /></div>
        <h1 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 'clamp(24px, 4vw, 36px)', color: '#0B3550', margin: '0 0 16px' }}>
          حدث خطأ ما
        </h1>
        <p style={{ fontSize: 15, color: '#7A8A99', marginBottom: 36, lineHeight: 1.75 }}>
          نعتذر، حدثت مشكلة غير متوقعة.<br />يمكنك المحاولة مجدداً أو العودة للرئيسية.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={reset} style={{ padding: '13px 28px', background: 'linear-gradient(135deg, #20A9F4, #0E8AD6)', color: '#fff', fontWeight: 700, fontSize: 15, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 20px rgba(174,68,90,.25)' }}>
            حاول مجدداً
          </button>
          <Link href="/" style={{ padding: '13px 28px', background: '#fff', border: '1.5px solid #E3F5FE', color: '#0B3550', fontWeight: 700, fontSize: 15, borderRadius: 10, textDecoration: 'none' }}>
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
