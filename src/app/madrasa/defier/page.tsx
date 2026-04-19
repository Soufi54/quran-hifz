'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Swords } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { madrasaStore, MadrasaView } from '@/lib/madrasa';

function DefierInner() {
  const router = useRouter();
  const search = useSearchParams();
  const id = search?.get('id') ?? '';
  const [view, setView] = useState<MadrasaView | null>(null);
  const [myId, setMyId] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const s = madrasaStore();
      const [v, me] = await Promise.all([s.getMadrasaView(id), s.getCurrentUser()]);
      setView(v);
      setMyId(me?.id ?? '');
    })();
  }, [id]);

  function pick(userId: string) {
    router.push(`/defis/nouveau?opponent=${userId}&madrasa=${id}`);
  }

  if (!view) {
    return (
      <main className="min-h-screen bg-[var(--bg)] p-4" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="text-[var(--text-muted)]">Chargement...</div>
      </main>
    );
  }

  const others = view.members.filter((m) => m.user_id !== myId);

  return (
    <main
      className="min-h-screen bg-[var(--bg)] pb-24"
      style={{ maxWidth: 480, margin: '0 auto' }}
    >
      <header className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Link
          href={`/madrasa/view?id=${id}`}
          className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-alt)]"
        >
          <ChevronLeft size={22} className="text-[var(--text)]" />
        </Link>
        <h1 className="text-xl font-bold text-[var(--text)]">Qui veux-tu defier ?</h1>
      </header>

      <div className="px-4">
        {others.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--text-muted)]">
            Tu es seul dans cette madrasa pour l&apos;instant.
          </div>
        ) : (
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden">
            {others.map((m) => (
              <button
                key={m.user_id}
                onClick={() => pick(m.user_id)}
                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[var(--bg-alt)] border-b border-[var(--border)] last:border-b-0 text-left"
              >
                <Avatar pseudo={m.pseudo} size="md" />
                <div className="flex-1">
                  <div className="font-semibold text-[var(--text)]">{m.pseudo}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {m.quiz_xp_this_week} XP cette semaine · {m.weeks_won} semaines gagnees
                  </div>
                </div>
                <Swords size={18} className="text-[var(--primary)]" />
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function DefierMembrePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] p-4 text-[var(--text-muted)]">
          Chargement...
        </div>
      }
    >
      <DefierInner />
    </Suspense>
  );
}
