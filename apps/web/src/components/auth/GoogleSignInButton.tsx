'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';
import { api } from '@/lib/api';
import { AuthResponse } from '@storebuilder/types';
import { toast } from 'sonner';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

interface Props {
  onSuccess?: () => void;
  label?: string;
}

export function GoogleSignInButton({ onSuccess, label = 'المتابعة مع Google' }: Props) {
  const router = useRouter();
  const loginStore = useAuthStore(s => s.login);
  const btnRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const handleCredential = async (response: { credential: string }) => {
    try {
      const res = await api.post<{ success: boolean; data: AuthResponse }>(
        '/api/auth/google',
        { credential: response.credential },
        { noAuth: true } as Parameters<typeof api.post>[2],
      );
      loginStore(res.data.user, res.data.token);
      toast.success('تم تسجيل الدخول بنجاح!');
      onSuccess?.();
      if (res.data.user.role === 'SUPER_ADMIN') router.push('/admin');
      else router.push('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل تسجيل الدخول بـ Google');
    }
  };

  useEffect(() => {
    if (!CLIENT_ID || initialized.current) return;

    const init = () => {
      if (!window.google || !btnRef.current) return;
      initialized.current = true;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredential,
        auto_select: false,
      });
      window.google.accounts.id.renderButton(btnRef.current, {
        type: 'standard',
        shape: 'rectangular',
        theme: 'outline',
        text: 'continue_with',
        size: 'large',
        logo_alignment: 'left',
        width: btnRef.current.offsetWidth || 340,
        locale: 'ar',
      });
    };

    // Load GSI script if not already loaded
    if (window.google) { init(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.head.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!CLIENT_ID || CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
    return (
      <button
        type="button"
        disabled
        style={{
          width: '100%', padding: '11px 0', border: '1.5px solid #FBE1EA',
          borderRadius: 10, background: '#FAFAFA', cursor: 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontSize: 14, color: '#9CA3AF', fontFamily: 'inherit',
        }}
        title="أضف NEXT_PUBLIC_GOOGLE_CLIENT_ID في ملف .env.local"
      >
        <GoogleIcon size={18} muted />
        {label} <span style={{ fontSize: 11 }}>(غير مُهيَّأ)</span>
      </button>
    );
  }

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div ref={btnRef} style={{ width: '100%' }} />
    </div>
  );
}

function GoogleIcon({ size = 18, muted = false }: { size?: number; muted?: boolean }) {
  const o = muted ? 0.4 : 1;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ opacity: o }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
