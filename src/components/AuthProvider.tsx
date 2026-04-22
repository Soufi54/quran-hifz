'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  supabaseMode: boolean;
  signInWithMagicLink: (email: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string, pseudo?: string) => Promise<void>;
  sendOtpCode: (email: string) => Promise<void>;
  verifyOtpCode: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabaseMode = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseMode);

  useEffect(() => {
    if (!supabaseMode) {
      setLoading(false);
      return;
    }
    const s = supabase();
    s.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = s.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabaseMode]);

  async function signInWithMagicLink(email: string): Promise<void> {
    if (!supabaseMode) throw new Error('Mode local : pas d auth');
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
    const { error } = await supabase().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;
  }

  async function signInWithPassword(email: string, password: string): Promise<void> {
    if (!supabaseMode) throw new Error('Mode local : pas d auth');
    const { error } = await supabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
  }

  async function signUpWithPassword(
    email: string,
    password: string,
    pseudo?: string,
  ): Promise<void> {
    if (!supabaseMode) throw new Error('Mode local : pas d auth');
    const { error } = await supabase().auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: pseudo ? { pseudo } : undefined,
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/madrasa` : undefined,
      },
    });
    if (error) throw error;
  }

  async function sendOtpCode(email: string): Promise<void> {
    if (!supabaseMode) throw new Error('Mode local : pas d auth');
    // shouldCreateUser: true = permet le signup via OTP, sinon rejeté si user inconnu
    const { error } = await supabase().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  }

  async function verifyOtpCode(email: string, token: string): Promise<void> {
    if (!supabaseMode) throw new Error('Mode local : pas d auth');
    const { error } = await supabase().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    });
    if (error) throw error;
  }

  async function signOut(): Promise<void> {
    if (!supabaseMode) return;
    await supabase().auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        supabaseMode,
        signInWithMagicLink,
        signInWithPassword,
        signUpWithPassword,
        sendOtpCode,
        verifyOtpCode,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
