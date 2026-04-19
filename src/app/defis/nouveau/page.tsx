'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Swords, Check } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { madrasaStore, Profile, Madrasa } from '@/lib/madrasa';

// Sourates les plus pratiquees pour le duel (V1 court). On peut ensuite plug
// le vrai catalogue complet depuis quran-meta.json.
const POPULAR_SURAHS: { number: number; name: string }[] = [
  { number: 1, name: 'Al-Fatiha' },
  { number: 36, name: 'Ya-Sin' },
  { number: 55, name: 'Ar-Rahman' },
  { number: 56, name: 'Al-Waqi\u2019a' },
  { number: 67, name: 'Al-Mulk' },
  { number: 78, name: 'An-Naba' },
  { number: 93, name: 'Ad-Duha' },
  { number: 112, name: 'Al-Ikhlas' },
  { number: 113, name: 'Al-Falaq' },
  { number: 114, name: 'An-Nas' },
];

function NouveauDefiInner() {
  const router = useRouter();
  const search = useSearchParams();
  const opponentParam = search?.get('opponent') ?? '';
  const madrasaParam = search?.get('madrasa') ?? '';

  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [madrasa, setMadrasa] = useState<Madrasa | null>(null);
  const [candidates, setCandidates] = useState<Profile[]>([]); // si pas d'opponent en url
  const [surahNumbers, setSurahNumbers] = useState<number[]>([]);
  const [numQuestions, setNumQuestions] = useState<5 | 10>(5);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = madrasaStore();
      const me = await s.getCurrentUser();
      if (opponentParam) {
        setOpponent(await s.getProfile(opponentParam));
      } else {
        // Pas d'opponent : on propose les amis + membres des madrasas
        const friends = await s.listFriends();
        const mads = await s.listMyMadrasas();
        const allIds = new Set<string>();
        const profiles: Profile[] = [];
        for (const f of friends) {
          if (f.profile.id !== me?.id && !allIds.has(f.profile.id)) {
            allIds.add(f.profile.id);
            profiles.push(f.profile);
          }
        }
        for (const m of mads) {
          const v = await s.getMadrasaView(m.id);
          if (!v) continue;
          for (const mm of v.members) {
            if (mm.user_id !== me?.id && !allIds.has(mm.user_id)) {
              allIds.add(mm.user_id);
              const p = await s.getProfile(mm.user_id);
              if (p) profiles.push(p);
            }
          }
        }
        setCandidates(profiles);
      }
      if (madrasaParam) {
        setMadrasa(await s.getMadrasa(madrasaParam));
      }
      setLoading(false);
    })();
  }, [opponentParam, madrasaParam]);

  function toggleSurah(n: number) {
    setSurahNumbers((cur) =>
      cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n],
    );
  }

  const canSubmit = useMemo(() => {
    return opponent && surahNumbers.length > 0 && !submitting;
  }, [opponent, surahNumbers, submitting]);

  async function submit() {
    if (!opponent) return;
    setSubmitting(true);
    setError(null);
    try {
      const c = await madrasaStore().createChallenge(
        opponent.id,
        surahNumbers,
        numQuestions,
        madrasa?.id ?? null,
      );
      router.push(`/defis?sent=${c.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen bg-[var(--bg)] pb-24"
      style={{ maxWidth: 480, margin: '0 auto' }}
    >
      <header className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Link
          href={madrasa ? `/madrasa/${madrasa.id}` : '/defis'}
          className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-alt)]"
        >
          <ChevronLeft size={22} className="text-[var(--text)]" />
        </Link>
        <h1 className="text-xl font-bold text-[var(--text)]">Lancer un defi</h1>
      </header>

      {loading ? (
        <div className="px-4 text-[var(--text-muted)]">Chargement...</div>
      ) : (
        <div className="px-4 space-y-4">
          {/* Adversaire */}
          {opponent ? (
            <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-4 flex items-center gap-3">
              <Avatar pseudo={opponent.pseudo} size="lg" />
              <div className="flex-1">
                <div className="text-xs text-[var(--text-muted)]">Adversaire</div>
                <div className="font-semibold text-[var(--text)]">{opponent.pseudo}</div>
                {madrasa && (
                  <div className="text-[11px] text-[var(--text-muted)]">
                    dans {madrasa.name}
                  </div>
                )}
              </div>
              {!madrasa && (
                <button
                  onClick={() => setOpponent(null)}
                  className="text-xs text-[var(--text-muted)] underline"
                >
                  Changer
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                Choisir l&apos;adversaire
              </div>
              {candidates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-[var(--text-muted)]">
                  Personne a defier. Ajoute des amis ou rejoins une madrasa.
                </div>
              ) : (
                <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden">
                  {candidates.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setOpponent(p)}
                      className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[var(--bg-alt)] border-b border-[var(--border)] last:border-b-0"
                    >
                      <Avatar pseudo={p.pseudo} size="sm" />
                      <div className="flex-1 text-left">
                        <div className="font-medium text-[var(--text)]">{p.pseudo}</div>
                      </div>
                      <Swords size={16} className="text-[var(--primary)]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sourates */}
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
              Sourate(s)
            </div>
            <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] divide-y divide-[var(--border)]">
              {POPULAR_SURAHS.map((s) => {
                const active = surahNumbers.includes(s.number);
                return (
                  <button
                    key={s.number}
                    onClick={() => toggleSurah(s.number)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 ${
                      active ? 'bg-[var(--primary)]/10' : 'hover:bg-[var(--bg-alt)]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        active
                          ? 'bg-[var(--primary)] border-[var(--primary)]'
                          : 'border-[var(--border)]'
                      }`}
                    >
                      {active && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 text-left">
                      <span className="font-medium text-[var(--text)]">{s.name}</span>
                      <span className="text-[var(--text-muted)] text-xs ml-2">#{s.number}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nombre de questions */}
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
              Nombre de questions
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[5, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setNumQuestions(n as 5 | 10)}
                  className={`py-3 rounded-2xl border-2 font-semibold transition-colors ${
                    numQuestions === n
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                      : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)]'
                  }`}
                >
                  {n} questions
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl p-3 bg-red-50 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Swords size={18} />
            {submitting ? 'Envoi...' : 'Envoyer le defi'}
          </button>

          <p className="text-[11px] text-[var(--text-muted)] text-center">
            Le defi expire dans 48h si non accepte. +50 XP pour le gagnant.
          </p>
        </div>
      )}
    </main>
  );
}

export default function NouveauDefiPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] p-4 text-[var(--text-muted)]">
          Chargement...
        </div>
      }
    >
      <NouveauDefiInner />
    </Suspense>
  );
}
