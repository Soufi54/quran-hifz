'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, Swords, ChevronRight, Trophy } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import Avatar from '@/components/Avatar';
import { madrasaStore, Challenge, Profile, isSupabaseMode } from '@/lib/madrasa';
import { useAuth } from '@/components/AuthProvider';

type ChallengeWithPeople = Challenge & {
  challenger: Profile | null;
  opponent: Profile | null;
};

export default function DefisPage() {
  const auth = useAuth();
  const supabaseMode = isSupabaseMode();
  const [incoming, setIncoming] = useState<ChallengeWithPeople[]>([]);
  const [outgoing, setOutgoing] = useState<ChallengeWithPeople[]>([]);
  const [history, setHistory] = useState<ChallengeWithPeople[]>([]);
  const [myId, setMyId] = useState<string>('');

  const enrich = useCallback(async (cs: Challenge[]): Promise<ChallengeWithPeople[]> => {
    const s = madrasaStore();
    const uniqIds = new Set<string>();
    for (const c of cs) {
      uniqIds.add(c.challenger_id);
      uniqIds.add(c.opponent_id);
    }
    const profiles: Record<string, Profile | null> = {};
    await Promise.all(
      Array.from(uniqIds).map(async (uid) => {
        profiles[uid] = await s.getProfile(uid);
      }),
    );
    return cs.map((c) => ({
      ...c,
      challenger: profiles[c.challenger_id],
      opponent: profiles[c.opponent_id],
    }));
  }, []);

  const refresh = useCallback(async () => {
    const s = madrasaStore();
    const [me, inc, out, done] = await Promise.all([
      s.getCurrentUser(),
      s.listIncomingChallenges(),
      s.listOutgoingChallenges(),
      s.listCompletedChallenges(),
    ]);
    setMyId(me?.id ?? '');
    const [a, b, c] = await Promise.all([enrich(inc), enrich(out), enrich(done)]);
    setIncoming(a);
    setOutgoing(b);
    setHistory(c);
  }, [enrich]);

  useEffect(() => {
    if (supabaseMode && (auth.loading || !auth.user)) return;
    refresh().catch((e) => console.error('Erreur chargement defis:', e));
  }, [refresh, supabaseMode, auth.loading, auth.user]);

  async function refuse(id: string) {
    await madrasaStore().refuseChallenge(id);
    refresh();
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
        <h1 className="text-xl font-bold text-[var(--text)]">Mes defis</h1>
      </header>

      {/* CTA lancer defi */}
      <section className="px-4 mb-4">
        <Link
          href="/defis/nouveau"
          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold"
        >
          <Swords size={18} /> Lancer un defi
        </Link>
      </section>

      {/* Recus */}
      {incoming.length > 0 && (
        <section className="px-4 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
            Recus ({incoming.length})
          </h2>
          <div className="space-y-2">
            {incoming.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-3"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Avatar pseudo={c.challenger?.pseudo ?? '?'} size="md" />
                  <div className="flex-1">
                    <div className="font-semibold text-[var(--text)]">
                      {c.challenger?.pseudo ?? 'Inconnu'}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      te defie · sourate
                      {c.surah_numbers.length > 1 ? 's' : ''}{' '}
                      {c.surah_numbers.join(', ')} · {c.num_questions} questions
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/defis/jouer?id=${c.id}`}
                    className="flex-1 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold text-center"
                  >
                    Relever le defi
                  </Link>
                  <button
                    onClick={() => refuse(c.id)}
                    className="px-4 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] text-sm"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Envoyes */}
      {outgoing.length > 0 && (
        <section className="px-4 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
            En attente ({outgoing.length})
          </h2>
          <div className="space-y-2">
            {outgoing.map((c) => (
              <Link
                key={c.id}
                href={c.status === 'accepted' && c.challenger_score === null ? `/defis/jouer?id=${c.id}` : '#'}
                className="block rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar pseudo={c.opponent?.pseudo ?? '?'} size="md" />
                  <div className="flex-1">
                    <div className="font-semibold text-[var(--text)]">
                      {c.opponent?.pseudo ?? 'Inconnu'}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {c.status === 'pending' ? 'Attend sa reponse' : 'Accepte - a ton tour !'} ·
                      sourate{c.surah_numbers.length > 1 ? 's' : ''}{' '}
                      {c.surah_numbers.join(', ')}
                    </div>
                  </div>
                  {c.status === 'accepted' && c.challenger_score === null && (
                    <ChevronRight size={18} className="text-[var(--primary)]" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Historique */}
      {history.length > 0 && (
        <section className="px-4 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2 flex items-center gap-2">
            <Trophy size={14} /> Historique
          </h2>
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden">
            {history.map((c) => {
              const opponent =
                c.challenger_id === myId ? c.opponent : c.challenger;
              const myScore =
                c.challenger_id === myId ? c.challenger_score : c.opponent_score;
              const theirScore =
                c.challenger_id === myId ? c.opponent_score : c.challenger_score;
              const won = c.winner_id === myId;
              const draw = c.winner_id === null;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-3 border-b border-[var(--border)] last:border-b-0"
                >
                  <Avatar pseudo={opponent?.pseudo ?? '?'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--text)] truncate">
                      vs {opponent?.pseudo ?? '?'}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {myScore}-{theirScore} ·{' '}
                      {draw ? 'Egalite' : won ? 'Victoire' : 'Defaite'}
                    </div>
                  </div>
                  <div
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      draw
                        ? 'bg-[var(--bg-alt)] text-[var(--text-muted)]'
                        : won
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                    }`}
                  >
                    {draw ? 'N' : won ? 'V' : 'D'}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {incoming.length === 0 && outgoing.length === 0 && history.length === 0 && (
        <section className="px-4">
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
            <Swords size={40} className="mx-auto text-[var(--text-muted)] mb-3" />
            <p className="text-[var(--text-muted)] mb-1">Aucun defi pour l&apos;instant</p>
            <p className="text-xs text-[var(--text-muted)]">
              Defie un ami ou un membre de ta madrasa
            </p>
          </div>
        </section>
      )}

      <BottomNav />
    </main>
  );
}
