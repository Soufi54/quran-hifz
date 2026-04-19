'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, LogIn } from 'lucide-react';
import { madrasaStore } from '@/lib/madrasa';

export default function RejoindreMadrasaPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (cleaned.length !== 6) {
      setError('Le code fait 6 caracteres');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const m = await madrasaStore().joinMadrasa(cleaned);
      router.push(`/madrasa/view?id=${m.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen bg-[var(--bg)] pb-24"
      style={{ maxWidth: 480, margin: '0 auto' }}
    >
      <header className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Link href="/madrasa" className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-alt)]">
          <ChevronLeft size={22} className="text-[var(--text)]" />
        </Link>
        <h1 className="text-xl font-bold text-[var(--text)]">Rejoindre une madrasa</h1>
      </header>

      <form onSubmit={submit} className="px-4 space-y-4">
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
              <LogIn size={18} className="text-[var(--primary)]" />
            </div>
            <div>
              <div className="font-semibold text-[var(--text)]">Code d&apos;invitation</div>
              <div className="text-xs text-[var(--text-muted)]">
                6 caracteres recus de l&apos;admin
              </div>
            </div>
          </div>

          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="HIFZ42"
            maxLength={6}
            className="w-full px-4 py-4 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] text-center text-2xl font-bold tracking-widest focus:outline-none focus:border-[var(--primary)]"
            autoFocus
            autoCapitalize="characters"
            autoCorrect="off"
          />
        </div>

        {error && (
          <div className="rounded-xl p-3 bg-red-50 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={code.length !== 6 || loading}
          className="w-full py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Verification...' : 'Rejoindre'}
        </button>

        <p className="text-xs text-[var(--text-muted)] text-center">
          Tu peux aussi cliquer sur un lien d&apos;invitation partage par quelqu&apos;un
          (ex: quranhifz.pages.dev/m/HIFZ42)
        </p>
      </form>
    </main>
  );
}
