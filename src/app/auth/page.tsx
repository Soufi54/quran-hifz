'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Check, ChevronLeft, UserPlus2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/components/AuthProvider';

type Mode = 'login' | 'signup' | 'magic';

export default function AuthPage() {
  const router = useRouter();
  const { user, supabaseMode, signInWithMagicLink, signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace('/madrasa');
  }, [user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'login') {
        await signInWithPassword(email, password);
        router.replace('/madrasa');
      } else if (mode === 'signup') {
        await signUpWithPassword(email, password, pseudo.trim() || undefined);
        router.replace('/madrasa');
      } else {
        await signInWithMagicLink(email);
        setSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  }

  if (!supabaseMode) {
    return (
      <main
        className="min-h-screen bg-[var(--bg)] p-4 flex flex-col items-center justify-center"
        style={{ maxWidth: 480, margin: '0 auto' }}
      >
        <p className="text-[var(--text-muted)] mb-4">Mode local — pas besoin de se connecter.</p>
        <Link href="/madrasa" className="text-[var(--primary)] font-semibold">
          Aller a la madrasa
        </Link>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-[var(--bg)] p-6 flex flex-col"
      style={{ maxWidth: 480, margin: '0 auto' }}
    >
      <div className="flex items-center mb-6">
        <Link href="/" className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-alt)]">
          <ChevronLeft size={22} className="text-[var(--text)]" />
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="text-[var(--primary)] mb-6">
          <Logo size={64} />
        </div>

        {sent ? (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
              <Check size={28} className="text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Verifie ton email</h1>
            <p className="text-[var(--text-muted)] mb-4">
              Un lien de connexion a ete envoye a <strong>{email}</strong>.
            </p>
            <p className="text-xs text-[var(--text-muted)] mb-6">
              Rien recu ? Verifie les spams. Ou utilise plutot le mot de passe.
            </p>
            <button
              onClick={() => {
                setSent(false);
                setMode('login');
              }}
              className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-semibold"
            >
              Revenir au login
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
              {mode === 'signup' ? 'Creer un compte' : mode === 'magic' ? 'Lien magique' : 'Se connecter'}
            </h1>
            <p className="text-[var(--text-muted)] mb-6">
              {mode === 'signup'
                ? 'Choisis un pseudo, un email et un mot de passe.'
                : mode === 'magic'
                  ? 'On t\u2019envoie un lien par email (verifie les spams).'
                  : 'Email + mot de passe.'}
            </p>

            <form onSubmit={submit} className="w-full space-y-3">
              {mode === 'signup' && (
                <div className="relative">
                  <UserPlus2
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="text"
                    value={pseudo}
                    onChange={(e) => setPseudo(e.target.value)}
                    placeholder="Pseudo (ex: Chaker)"
                    maxLength={30}
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
              )}
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              {mode !== 'magic' && (
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="mot de passe (min 6 car.)"
                    required
                    minLength={6}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
              )}

              {error && (
                <div className="rounded-xl p-3 bg-red-50 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {submitting
                  ? 'Envoi...'
                  : mode === 'signup'
                    ? 'Creer mon compte'
                    : mode === 'magic'
                      ? 'Envoyer le lien'
                      : 'Se connecter'}
              </button>
            </form>

            <div className="mt-6 space-y-2 text-sm text-[var(--text-muted)]">
              {mode === 'login' && (
                <>
                  <button onClick={() => setMode('signup')} className="underline">
                    Pas encore de compte ? Cree-en un
                  </button>
                  <br />
                  <button onClick={() => setMode('magic')} className="underline">
                    Ou recevoir un lien par email
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <button onClick={() => setMode('login')} className="underline">
                  J&apos;ai deja un compte
                </button>
              )}
              {mode === 'magic' && (
                <button onClick={() => setMode('login')} className="underline">
                  Utiliser un mot de passe a la place
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
