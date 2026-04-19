'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Swords, Trophy } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { madrasaStore, Challenge, Profile } from '@/lib/madrasa';

function JouerDefiInner() {
  const router = useRouter();
  const search = useSearchParams();
  const id = search?.get('id') ?? '';

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [challenger, setChallenger] = useState<Profile | null>(null);
  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [myId, setMyId] = useState<string>('');
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Defi introuvable');
      return;
    }
    (async () => {
      const s = madrasaStore();
      const me = await s.getCurrentUser();
      setMyId(me?.id ?? '');
      const all = [
        ...(await s.listIncomingChallenges()),
        ...(await s.listOutgoingChallenges()),
        ...(await s.listCompletedChallenges()),
      ];
      const c = all.find((x) => x.id === id);
      if (!c) {
        setError('Defi introuvable');
        return;
      }
      setChallenge(c);
      setChallenger(await s.getProfile(c.challenger_id));
      setOpponent(await s.getProfile(c.opponent_id));
    })();
  }, [id]);

  async function accept() {
    if (!challenge) return;
    try {
      await madrasaStore().acceptChallenge(challenge.id);
      const fresh = (await madrasaStore().listOutgoingChallenges())
        .concat(await madrasaStore().listIncomingChallenges())
        .find((x) => x.id === challenge.id);
      setChallenge(fresh ?? { ...challenge, status: 'accepted' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  async function submitScore() {
    if (!challenge || selectedScore === null) return;
    setSubmitting(true);
    try {
      await madrasaStore().recordChallengeScore(challenge.id, selectedScore);
      router.push('/defis');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--bg)] p-4" style={{ maxWidth: 480, margin: '0 auto' }}>
        <Link href="/defis" className="text-[var(--text-muted)]">
          Retour
        </Link>
        <p className="mt-4 text-red-500">{error}</p>
      </main>
    );
  }

  if (!challenge || !challenger || !opponent) {
    return (
      <main className="min-h-screen bg-[var(--bg)] p-4" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="text-[var(--text-muted)]">Chargement...</div>
      </main>
    );
  }

  const iAmChallenger = challenge.challenger_id === myId;
  const myScore = iAmChallenger ? challenge.challenger_score : challenge.opponent_score;
  const iNeedToPlay =
    myScore === null &&
    (iAmChallenger
      ? challenge.status === 'accepted'
      : challenge.status === 'accepted' || challenge.status === 'pending');

  return (
    <main
      className="min-h-screen bg-[var(--bg)] pb-24"
      style={{ maxWidth: 480, margin: '0 auto' }}
    >
      <header className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Link href="/defis" className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-alt)]">
          <ChevronLeft size={22} className="text-[var(--text)]" />
        </Link>
        <h1 className="text-xl font-bold text-[var(--text)]">Duel 1v1</h1>
      </header>

      <section className="px-4 mb-4">
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 flex items-center justify-around">
          <div className="text-center">
            <Avatar pseudo={challenger.pseudo} size="xl" />
            <div className="font-semibold text-[var(--text)] mt-2">{challenger.pseudo}</div>
            <div className="text-2xl font-bold text-[var(--primary)] mt-1">
              {challenge.challenger_score ?? '-'}
            </div>
          </div>
          <div className="text-center">
            <Swords size={32} className="text-[var(--text-muted)]" />
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {challenge.num_questions} Q
            </div>
          </div>
          <div className="text-center">
            <Avatar pseudo={opponent.pseudo} size="xl" />
            <div className="font-semibold text-[var(--text)] mt-2">{opponent.pseudo}</div>
            <div className="text-2xl font-bold text-[var(--primary)] mt-1">
              {challenge.opponent_score ?? '-'}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 mb-4">
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-4">
          <div className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-1">
            Sourate{challenge.surah_numbers.length > 1 ? 's' : ''} du duel
          </div>
          <div className="text-[var(--text)] font-semibold">
            {challenge.surah_numbers.map((n) => `#${n}`).join(', ')}
          </div>
        </div>
      </section>

      {challenge.status === 'pending' && !iAmChallenger && (
        <section className="px-4">
          <button
            onClick={accept}
            className="w-full py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold"
          >
            Accepter le defi
          </button>
        </section>
      )}

      {challenge.status === 'pending' && iAmChallenger && (
        <section className="px-4 text-center text-[var(--text-muted)]">
          En attente de {opponent.pseudo}...
        </section>
      )}

      {challenge.status === 'accepted' && iNeedToPlay && (
        <section className="px-4 space-y-3">
          <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800 dark:bg-yellow-900/10 dark:border-yellow-800/40 dark:text-yellow-200">
            <strong>Mode test (V1)</strong> — Le quiz reel sera branche a l&apos;etape
            suivante. Choisis ton score pour simuler le duel :
          </div>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: challenge.num_questions + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedScore(i)}
                className={`py-3 rounded-xl border-2 font-semibold ${
                  selectedScore === i
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)]'
                }`}
              >
                {i}
              </button>
            ))}
          </div>
          <button
            onClick={submitScore}
            disabled={selectedScore === null || submitting}
            className="w-full py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold disabled:opacity-50"
          >
            {submitting
              ? 'Envoi...'
              : `Valider score ${selectedScore ?? '?'}/${challenge.num_questions}`}
          </button>
        </section>
      )}

      {challenge.status === 'accepted' && !iNeedToPlay && (
        <section className="px-4 text-center text-[var(--text-muted)]">
          Score envoye ({myScore}/{challenge.num_questions}). En attente du second joueur.
        </section>
      )}

      {challenge.status === 'completed' && (
        <section className="px-4">
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5 text-center">
            <Trophy size={40} className="mx-auto text-yellow-500 mb-3" />
            {challenge.winner_id === null ? (
              <>
                <div className="text-xl font-bold text-[var(--text)] mb-1">Egalite !</div>
                <div className="text-sm text-[var(--text-muted)]">+25 XP chacun</div>
              </>
            ) : challenge.winner_id === myId ? (
              <>
                <div className="text-xl font-bold text-[var(--primary)] mb-1">Victoire !</div>
                <div className="text-sm text-[var(--text-muted)]">+{challenge.xp_reward} XP</div>
              </>
            ) : (
              <>
                <div className="text-xl font-bold text-[var(--text)] mb-1">Defaite</div>
                <div className="text-sm text-[var(--text-muted)]">
                  {challenge.winner_id === challenge.challenger_id
                    ? challenger.pseudo
                    : opponent.pseudo}{' '}
                  remporte le duel.
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {challenge.status === 'refused' && (
        <section className="px-4 text-center text-[var(--text-muted)]">Defi refuse.</section>
      )}

      {challenge.status === 'expired' && (
        <section className="px-4 text-center text-[var(--text-muted)]">
          Defi expire (48h sans reponse).
        </section>
      )}
    </main>
  );
}

export default function JouerDefiPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] p-4 text-[var(--text-muted)]">
          Chargement...
        </div>
      }
    >
      <JouerDefiInner />
    </Suspense>
  );
}
