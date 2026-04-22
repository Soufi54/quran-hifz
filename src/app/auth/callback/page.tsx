'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check } from 'lucide-react';
import Logo from '@/components/Logo';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type Status = 'processing' | 'done' | 'error';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('processing');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace('/madrasa');
      return;
    }

    const hash = window.location.hash;
    if (!hash) {
      setStatus('error');
      setErrorMsg('Lien invalide ou expire.');
      return;
    }

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      setStatus('error');
      setErrorMsg('Tokens manquants dans le lien.');
      return;
    }

    supabase()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setStatus('error');
          setErrorMsg(error.message);
          return;
        }
        setStatus('done');
        if (isStandalone()) {
          router.replace('/madrasa');
        }
      });
  }, [router]);

  if (status === 'processing') {
    return (
      <main
        className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6"
        style={{ maxWidth: 480, margin: '0 auto' }}
      >
        <div className="text-[var(--primary)] mb-4">
          <Logo size={48} />
        </div>
        <p className="text-[var(--text-muted)] text-sm">Connexion en cours...</p>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main
        className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6 text-center"
        style={{ maxWidth: 480, margin: '0 auto' }}
      >
        <div className="text-[var(--primary)] mb-4">
          <Logo size={48} />
        </div>
        <h1 className="text-xl font-bold text-[var(--text)] mb-2">Lien invalide</h1>
        <p className="text-[var(--text-muted)] text-sm mb-6">{errorMsg}</p>
        <Link
          href="/auth"
          className="py-3 px-6 rounded-xl bg-[var(--primary)] text-white font-semibold"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  // status === 'done' && not standalone
  return (
    <main
      className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6 text-center"
      style={{ maxWidth: 480, margin: '0 auto' }}
    >
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
        <Check size={32} className="text-green-600 dark:text-green-400" />
      </div>
      <h1 className="text-xl font-bold text-[var(--text)] mb-2">Connexion reussie</h1>
      <p className="text-[var(--text-muted)] text-sm mb-8">
        Tu es connecte. Ouvre l&apos;application depuis ton ecran d&apos;accueil.
      </p>

      <a
        href="https://quranhifz.pages.dev/madrasa"
        className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-semibold text-center block mb-4"
      >
        Ouvrir Quran Hifz
      </a>

      <p className="text-xs text-[var(--text-muted)]">
        Si l&apos;app ne s&apos;ouvre pas automatiquement, ouvre-la depuis ton ecran d&apos;accueil.
      </p>
    </main>
  );
}
