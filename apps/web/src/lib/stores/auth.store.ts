'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserPublic } from '@storebuilder/types';

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// Always persists to localStorage so auth survives page refresh and browser restart.
const localStore = {
  getItem: (name: string): string | null =>
    typeof window === 'undefined' ? null : localStorage.getItem(name),
  setItem: (name: string, value: string): void => {
    if (typeof window !== 'undefined') localStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    if (typeof window !== 'undefined') localStorage.removeItem(name);
  },
};

interface AuthState {
  user: UserPublic | null;
  token: string | null;
  isLoading: boolean;
  _hasHydrated: boolean;
  login: (user: UserPublic, token: string, remember?: boolean) => void;
  logout: () => void;
  setUser: (user: UserPublic) => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      _hasHydrated: false,
      login: (user, token, remember = true) => {
        localStorage.setItem('sb_token', token);
        setCookie('sb_token', token, remember ? 30 : 7);
        set({ user, token, isLoading: false });
      },
      logout: () => {
        localStorage.removeItem('sb_token');
        deleteCookie('sb_token');
        set({ user: null, token: null });
      },
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'sb_auth',
      storage: createJSONStorage(() => localStore),
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
