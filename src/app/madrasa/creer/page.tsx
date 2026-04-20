'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Users } from 'lucide-react';
import { madrasaStore } from '@/lib/madrasa';

export default function CreerMadrasaPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const m = await madrasaStore().createMadrasa(name);
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
        <h1 className="text-xl font-bold text-[var(--text)]">Creer une madrasa</h1>
      </header>

      <form onSubmit={submit} className="px-4 space-y-4">
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
              <Users size={18} className="text-[var(--primary)]" />
            </div>
            <div>
              <div className="font-semibold text-[var(--text)]">Nouveau groupe</div>
              <div className="text-xs text-[var(--text-muted)]">
                Jusqu&apos;a 50 membres, generation d&apos;un code d&apos;invitation
              </div>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-[var(--text)] mb-2 block">
              Nom du groupe
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Famille Chaker, Classe Tajwid..."
              maxLength={40}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
              autoFocus
            />
          </label>
        </div>

        {error && (
          <div className="rounded-xl p-3 bg-red-50 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!name.trim() || loading}
          className="w-full py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Creation...' : 'Creer la madrasa'}
        </button>

        <p className="text-xs text-[var(--text-muted)] text-center">
          Un code d&apos;invitation de 6 caracteres sera genere. Tu pourras le partager par lien
          WhatsApp, SMS, etc.
        </p>
      </form>
    </main>
  );
}
