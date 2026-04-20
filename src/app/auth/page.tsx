'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Check, ChevronLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/components/AuthProvider';

export default function AuthPage() {
  const router = useRouter();
  const { user, supabaseMode, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
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
      await signInWithMagicLink(email);
      setSent(true);
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
        <p className="text-[var(--text-muted)] mb-4">
          Mode local — pas besoin de se connecter.
        </p>
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
      <div className="flex items-center mb-8">
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
            <p className="text-[var(--text-muted)] mb-6">
              Un lien de connexion a ete envoye a <strong>{email}</strong>.
              Clique dessus pour te connecter.
            </p>
            <button
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
              className="text-sm text-[var(--primary)] underline"
            >
              Utiliser une autre adresse
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Se connecter</h1>
            <p className="text-[var(--text-muted)] mb-8">
              Entre ton email, on t&apos;envoie un lien magique pour te connecter sans mot
              de passe.
            </p>

            <form onSubmit={submit} className="w-full space-y-3">
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
                {submitting ? 'Envoi...' : 'Envoyer le lien'}
              </button>
            </form>

            <p className="text-xs text-[var(--text-muted)] mt-6 max-w-xs">
              Pas de mot de passe a retenir. Un email suffit.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
