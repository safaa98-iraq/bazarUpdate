'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { AuthResponse } from '@storebuilder/types';
import { Loader2, Eye, EyeOff, ShoppingBag, Lock, Mail } from 'lucide-react';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const C = { bg: '#FBF9F2', p: '#2F2E4B', a: '#DB6E93', blue: '#4A8AC7', blueHover: '#3671A8', border: '#FBE1EA', text: '#2F2E4B', muted: '#6B6A83' };

const schema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});
type FormData = z.infer<typeof schema>;

function CustomerLoginForm() {
  useDocumentTitle('دخول العملاء');
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore(s => s.login);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; data: AuthResponse }>('/api/auth/login', data);
      if (res.data.user.role !== 'CUSTOMER') {
        toast.error('هذا الحساب ليس حساب زبون. سجّل الدخول من صفحة دخول التجار.');
        return;
      }
      login(res.data.user, res.data.token, true);
      router.push(searchParams.get('redirect') || '/account/orders');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-tajawal)', padding: 24 }} dir="rtl">
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 40, height: 40, background: C.p, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={20} color="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 26, color: C.p }}>بازار</span>
          </Link>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: '40px 32px', boxShadow: '0 8px 40px rgba(47,46,75,.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 24, color: C.text, marginBottom: 6 }}>مرحباً بعودتك</h1>
            <p style={{ fontSize: 14, color: C.muted }}>سجّل الدخول لتتبع طلباتك</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.p, marginBottom: 6 }}>البريد الإلكتروني</label>
              <div style={{ position: 'relative' }}>
                <input {...register('email')} type="email" dir="ltr" placeholder="you@example.com"
                  style={{ width: '100%', padding: '12px 16px 12px 40px', background: C.bg, border: `1.5px solid ${errors.email ? '#f87171' : C.border}`, borderRadius: 10, fontSize: 14, outline: 'none', textAlign: 'left' }} />
                <Mail size={16} color={C.muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              {errors.email && <p style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>{errors.email.message}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.p, marginBottom: 6 }}>كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <input {...register('password')} type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  style={{ width: '100%', padding: '12px 40px', background: C.bg, border: `1.5px solid ${errors.password ? '#f87171' : C.border}`, borderRadius: 10, fontSize: 14, outline: 'none' }} />
                <Lock size={16} color={C.muted} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: 14, background: loading ? 'rgba(74,138,199,.5)' : C.blue, color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = C.blueHover; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.blue; }}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> جارٍ التحقق...</> : 'تسجيل الدخول'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: C.muted, marginTop: 24 }}>
            ليس لديك حساب؟{' '}
            <Link href="/account/register" style={{ color: C.a, fontWeight: 700, textDecoration: 'none' }}>أنشئ حساباً</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: C.bg }} />}>
      <CustomerLoginForm />
    </Suspense>
  );
}
