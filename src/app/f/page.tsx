'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UserPlus2, X } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { madrasaStore, Profile } from '@/lib/madrasa';

function AddFriendInner() {
  const search = useSearchParams();
  const code = (search?.get('code') ?? '').toUpperCase();
  const [target, setTarget] = useState<Profile | null>(null);
  const [state, setState] = useState<
    'loading' | 'ready' | 'self' | 'already' | 'sending' | 'sent' | 'error'
  >('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError('Aucun code fourni.');
      setState('error');
      return;
    }
    (async () => {
      const s = madrasaStore();
      const [u, p] = await Promise.all([s.getCurrentUser(), s.getProfileByFriendCode(code)]);
      if (!p) {
        setError('Code ami introuvable');
        setState('error');
        return;
      }
      setTarget(p);
      if (u && u.id === p.id) {
        setState('self');
      } else {
        const friends = await s.listFriends();
        const already = friends.some((f) => f.profile.id === p.id);
        setState(already ? 'already' : 'ready');
      }
    })();
  }, [code]);

  async function send() {
    if (!target) return;
    setState('sending');
    try {
      await madrasaStore().sendFriendRequest(target.id);
      setState('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setState('error');
    }
  }

  return (
    <main
      className="min-h-screen bg-[var(--bg)] p-4 flex flex-col items-center justify-center"
      style={{ maxWidth: 480, margin: '0 auto' }}
    >
      {state === 'loading' && (
        <div className="text-[var(--text-muted)]">Chargement...</div>
      )}

      {state === 'error' && (
        <>
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 dark:bg-red-900/20">
            <X size={32} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-2">Code invalide</h1>
          <p className="text-[var(--text-muted)] text-center mb-6">{error ?? 'Erreur'}</p>
          <Link
            href="/amis"
            className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold"
          >
            Mes amis
          </Link>
        </>
      )}

      {target && state !== 'error' && state !== 'loading' && (
        <>
          <Avatar pseudo={target.pseudo} size="xl" className="mb-4" />
          <div className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Ajouter en ami
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)] mb-1">{target.pseudo}</h1>
          <p className="text-sm text-[var(--text-muted)] mb-8">Code {target.friend_code}</p>

          {state === 'self' && (
            <>
              <p className="text-[var(--text-muted)] text-center mb-4">C&apos;est toi !</p>
              <Link
                href="/amis"
                className="w-full py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold text-center"
              >
                Ok
              </Link>
            </>
          )}

          {state === 'already' && (
            <>
              <div className="w-full rounded-xl p-3 bg-green-50 text-green-700 text-sm mb-3 text-center dark:bg-green-900/20 dark:text-green-300">
                Vous etes deja amis
              </div>
              <Link
                href="/amis"
                className="w-full py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold text-center"
              >
                Voir mes amis
              </Link>
            </>
          )}

          {state === 'ready' && (
            <>
              <button
                onClick={send}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 mb-2"
              >
                <UserPlus2 size={18} />
                Envoyer une demande
              </button>
              <Link
                href="/amis"
                className="w-full py-3 rounded-2xl bg-transparent text-[var(--text-muted)] font-medium text-center block"
              >
                Plus tard
              </Link>
            </>
          )}

          {state === 'sending' && <div className="text-[var(--text-muted)]">Envoi...</div>}

          {state === 'sent' && (
            <>
              <div className="w-full rounded-xl p-3 bg-green-50 text-green-700 text-sm mb-3 text-center dark:bg-green-900/20 dark:text-green-300">
                Demande envoyee a {target.pseudo}
              </div>
              <Link
                href="/amis"
                className="w-full py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold text-center"
              >
                Ok
              </Link>
            </>
          )}
        </>
      )}
    </main>
  );
}

export default function AddFriendPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] p-4 text-[var(--text-muted)]">
          Chargement...
        </div>
      }
    >
      <AddFriendInner />
    </Suspense>
  );
}
