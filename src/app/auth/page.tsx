'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Check, ChevronLeft, UserPlus2, KeyRound } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/components/AuthProvider';

type Mode = 'login' | 'signup' | 'otp';

export default function AuthPage() {
  const router = useRouter();
  const {
    user,
    supabaseMode,
    signInWithPassword,
    signUpWithPassword,
    sendOtpCode,
    verifyOtpCode,
  } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace('/madrasa');
  }, [user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'login') {
        await signInWithPassword(email, password);
        router.replace('/madrasa');
      } else if (mode === 'signup') {
        try {
          await signUpWithPassword(email, password, pseudo.trim() || undefined);
          router.replace('/madrasa');
        } catch (err) {
          const msg = err instanceof Error ? err.message.toLowerCase() : '';
          if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
            // User deja existant : basculer en login avec message
            setMode('login');
            setInfo('Tu as deja un compte avec cet email. Connecte-toi.');
            setPseudo('');
            setSubmitting(false);
            return;
          }
          throw err;
        }
      } else if (mode === 'otp') {
        if (!otpSent) {
          await sendOtpCode(email);
          setOtpSent(true);
          setInfo('Code envoye. Verifie tes mails (+ les spams).');
        } else {
          await verifyOtpCode(email, otp);
          router.replace('/madrasa');
        }
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

        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
          {mode === 'signup'
            ? 'Creer un compte'
            : mode === 'otp'
              ? otpSent
                ? 'Entrer le code'
                : 'Code par email'
              : 'Se connecter'}
        </h1>
        <p className="text-[var(--text-muted)] mb-6">
          {mode === 'signup'
            ? 'Choisis un pseudo, un email et un mot de passe.'
            : mode === 'otp'
              ? otpSent
                ? 'Colle le code 6 chiffres recu par email.'
                : 'On t\u2019envoie un code 6 chiffres par email. Pas de lien a cliquer.'
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
          {!(mode === 'otp' && otpSent) && (
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
          )}
          {(mode === 'login' || mode === 'signup') && (
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
          {mode === 'otp' && otpSent && (
            <div className="relative">
              <KeyRound
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
                maxLength={6}
                autoFocus
                autoComplete="one-time-code"
                className="w-full pl-10 pr-3 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] text-center tracking-widest text-2xl font-mono focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          )}

          {info && (
            <div className="rounded-xl p-3 bg-green-50 text-green-800 text-sm dark:bg-green-900/20 dark:text-green-200">
              {info}
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
                : mode === 'otp'
                  ? otpSent
                    ? 'Valider'
                    : 'Recevoir un code'
                  : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-sm text-[var(--text-muted)]">
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('signup'); setError(null); setInfo(null); }} className="underline">
                Pas encore de compte ? Cree-en un
              </button>
              <br />
              <button onClick={() => { setMode('otp'); setOtpSent(false); setError(null); setInfo(null); }} className="underline">
                Me connecter sans mot de passe (code par email)
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button onClick={() => { setMode('login'); setError(null); setInfo(null); }} className="underline">
              J&apos;ai deja un compte
            </button>
          )}
          {mode === 'otp' && otpSent && (
            <>
              <button onClick={() => { setOtpSent(false); setOtp(''); setError(null); setInfo(null); }} className="underline">
                Renvoyer le code / changer d&apos;email
              </button>
              <br />
              <button onClick={() => { setMode('login'); setOtpSent(false); setError(null); setInfo(null); }} className="underline">
                Retour au login par mot de passe
              </button>
            </>
          )}
          {mode === 'otp' && !otpSent && (
            <button onClick={() => { setMode('login'); setError(null); setInfo(null); }} className="underline">
              Retour au login par mot de passe
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
