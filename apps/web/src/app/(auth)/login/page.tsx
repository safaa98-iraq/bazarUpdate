'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { AuthResponse } from '@storebuilder/types';
import { Loader2, Eye, EyeOff, ShoppingBag, Lock, Mail } from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const C = {
  bg:     '#FBF9F2',
  p:      '#2F2E4B',
  a:      '#DB6E93',
  blue:      '#4A8AC7',
  blueHover: '#3671A8',
  soft:   '#FBE1EA',
  text:   '#2F2E4B',
  muted:  '#6B6A83',
  border: '#FBE1EA',
};

const schema = z.object({
  email:    z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  useDocumentTitle('تسجيل الدخول');
  const router = useRouter();
  const login  = useAuthStore(s => s.login);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [remember, setRemember] = useState(true);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; data: AuthResponse }>('/api/auth/login', data);
      login(res.data.user, res.data.token, remember);
      if (res.data.user.role === 'SUPER_ADMIN') router.push('/admin');
      else if (res.data.user.role === 'MERCHANT') router.push('/dashboard');
      else router.push('/');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', fontFamily: 'var(--font-tajawal)', position: 'relative', overflow: 'hidden' }}>

      {/* Left decorative panel (desktop) */}
      <div style={{ display: 'none', flex: '0 0 42%', background: C.p, position: 'relative', overflow: 'hidden' }} className="login-left-panel">
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 10, background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <ShoppingBag size={32} color="#fff" strokeWidth={1.5} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 32, color: '#fff', marginBottom: 16, lineHeight: 1.3 }}>مرحباً بعودتك</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.55)', lineHeight: 1.8, maxWidth: 280 }}>
            سجّل الدخول لإدارة متجرك ومتابعة طلباتك وعملائك
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{ width: 40, height: 40, background: C.p, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag size={20} color="#fff" />
              </div>
              <span style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 26, color: C.p }}>بازار</span>
            </Link>
          </div>

          {/* Card */}
          <div style={{ background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: 10, padding: '44px 40px', boxShadow: '0 8px 40px rgba(67,46,84,.08)' }}>

            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <h1 style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, fontSize: 26, color: C.text, marginBottom: 8 }}>أهلاً بعودتك</h1>
              <p style={{ fontSize: 14, color: C.muted }}>سجّل الدخول لإدارة متجرك</p>
            </div>

            {/* Google Sign-In */}
            <div style={{ marginBottom: 8 }}>
              <GoogleSignInButton label="تسجيل الدخول بـ Google" />
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 16px' }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 12, color: '#6B6A83', whiteSpace: 'nowrap' }}>أو بالبريد الإلكتروني</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.p, marginBottom: 8 }}>البريد الإلكتروني</label>
                <div style={{ position: 'relative' }}>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@example.com"
                    dir="ltr"
                    style={{ width: '100%', padding: '12px 16px 12px 44px', background: C.bg, border: `1.5px solid ${errors.email ? 'rgba(239,68,68,.5)' : C.border}`, borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: C.text, textAlign: 'left', transition: 'border-color .2s', caretColor: C.a }}
                    onFocus={e => (e.target.style.borderColor = `rgba(219,110,147,.4)`)}
                    onBlur={e => (e.target.style.borderColor = errors.email ? 'rgba(239,68,68,.5)' : C.border)}
                  />
                  <Mail size={16} color={C.muted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
                {errors.email && <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6 }}>{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.p, marginBottom: 8 }}>كلمة المرور</label>
                <div style={{ position: 'relative' }}>
                  <input
                    {...register('password')}
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '12px 44px 12px 44px', background: C.bg, border: `1.5px solid ${errors.password ? 'rgba(239,68,68,.5)' : C.border}`, borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: C.text, transition: 'border-color .2s', caretColor: C.a }}
                    onFocus={e => (e.target.style.borderColor = `rgba(219,110,147,.4)`)}
                    onBlur={e => (e.target.style.borderColor = errors.password ? 'rgba(239,68,68,.5)' : C.border)}
                  />
                  <Lock size={16} color={C.muted} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 0, display: 'flex' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p style={{ color: '#DC2626', fontSize: 12, marginTop: 6 }}>{errors.password.message}</p>}
              </div>

              {/* Remember Me */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                <div
                  onClick={() => setRemember(r => !r)}
                  style={{
                    width: 20, height: 20, borderRadius: 10, border: `2px solid ${remember ? C.a : C.border}`,
                    background: remember ? C.a : 'transparent', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', transition: 'all .2s', flexShrink: 0, cursor: 'pointer',
                  }}
                >
                  {remember && (
                    <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                      <path d="M1 4L4 7L10 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span
                  onClick={() => setRemember(r => !r)}
                  style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}
                >
                  ابقني مسجلاً
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '14px 0', background: loading ? 'rgba(74,138,199,.5)' : C.blue, color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', marginTop: 4, transition: 'background .2s' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = C.blueHover; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.blue; }}>
                {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> جارٍ التحقق...</> : 'تسجيل الدخول'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, color: C.muted, marginTop: 28 }}>
              ليس لديك حساب؟{' '}
              <Link href="/register" style={{ color: C.a, fontWeight: 700, textDecoration: 'none' }}>أنشئ متجرك مجاناً</Link>
            </p>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 24, opacity: .6 }}>
            بالدخول، أنت توافق على{' '}
            <a href="#" style={{ color: C.p, textDecoration: 'none' }}>شروط الاستخدام</a>
            {' '}و{' '}
            <a href="#" style={{ color: C.p, textDecoration: 'none' }}>سياسة الخصوصية</a>
          </p>
        </div>
      </div>
    </div>
  );
}
