'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Users, Check, X } from 'lucide-react';
import { madrasaStore, Madrasa } from '@/lib/madrasa';

function JoinByCodeInner() {
  const router = useRouter();
  const search = useSearchParams();
  const code = (search?.get('code') ?? '').toUpperCase();
  const [madrasa, setMadrasa] = useState<Madrasa | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [adminPseudo, setAdminPseudo] = useState('');
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!code) {
      setError('Aucun code fourni. Utilise un lien d\u2019invitation complet.');
      setLoading(false);
      return;
    }
    (async () => {
      const s = madrasaStore();
      const m = await s.getMadrasaByInviteCode(code);
      if (!m) {
        setError('Code invalide. Verifie le lien avec la personne qui t\u2019a invite.');
        setLoading(false);
        return;
      }
      setMadrasa(m);
      const view = await s.getMadrasaView(m.id);
      if (view) {
        setMemberCount(view.members.length);
        const admin = view.members.find((mm) => mm.is_admin);
        setAdminPseudo(admin?.pseudo ?? '');
        const me = await s.getCurrentUser();
        if (me && view.members.some((mm) => mm.user_id === me.id)) {
          setAlreadyMember(true);
        }
      }
      setLoading(false);
    })();
  }, [code]);

  async function accept() {
    if (!madrasa) return;
    setJoining(true);
    setError(null);
    try {
      await madrasaStore().joinMadrasa(madrasa.invite_code);
      router.push(`/madrasa/view?id=${madrasa.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <main
        className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4"
        style={{ maxWidth: 480, margin: '0 auto' }}
      >
        <div className="text-[var(--text-muted)]">Chargement de l&apos;invitation...</div>
      </main>
    );
  }

  if (error && !madrasa) {
    return (
      <main
        className="min-h-screen bg-[var(--bg)] p-4 flex flex-col items-center justify-center"
        style={{ maxWidth: 480, margin: '0 auto' }}
      >
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 dark:bg-red-900/20">
          <X size={32} className="text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-[var(--text)] mb-2">Invitation invalide</h1>
        <p className="text-[var(--text-muted)] text-center mb-6">{error}</p>
        <Link
          href="/madrasa"
          className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold"
        >
          Mes madrasas
        </Link>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-[var(--bg)] p-4 flex flex-col items-center justify-center"
      style={{ maxWidth: 480, margin: '0 auto' }}
    >
      <div className="w-20 h-20 rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-6">
        <Users size={36} className="text-[var(--primary)]" />
      </div>

      <div className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">
        Invitation
      </div>
      <h1 className="text-2xl font-bold text-[var(--text)] mb-1 text-center">
        {madrasa!.name}
      </h1>
      {adminPseudo && (
        <p className="text-[var(--text-muted)] mb-1">Cree par {adminPseudo}</p>
      )}
      <p className="text-sm text-[var(--text-muted)] mb-8">
        {memberCount} membre{memberCount > 1 ? 's' : ''} · Code {madrasa!.invite_code}
      </p>

      {alreadyMember ? (
        <>
          <div className="w-full rounded-2xl bg-green-50 border border-green-200 p-4 flex items-center gap-3 mb-4 dark:bg-green-900/20 dark:border-green-700">
            <Check size={20} className="text-green-600 dark:text-green-400" />
            <div className="flex-1 text-sm text-green-800 dark:text-green-200">
              Tu es deja membre de cette madrasa
            </div>
          </div>
          <Link
            href={`/madrasa/view?id=${madrasa!.id}`}
            className="w-full py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold text-center"
          >
            Voir la madrasa
          </Link>
        </>
      ) : (
        <>
          {error && (
            <div className="w-full rounded-xl p-3 bg-red-50 text-red-700 text-sm mb-3 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}
          <button
            onClick={accept}
            disabled={joining}
            className="w-full py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50 mb-2"
          >
            {joining ? 'Rejoindre...' : `Rejoindre ${madrasa!.name}`}
          </button>
          <Link
            href="/madrasa"
            className="w-full py-3 rounded-2xl bg-transparent text-[var(--text-muted)] font-medium text-center block"
          >
            Plus tard
          </Link>
        </>
      )}
    </main>
  );
}

export default function JoinByCodePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] p-4 text-[var(--text-muted)]">
          Chargement...
        </div>
      }
    >
      <JoinByCodeInner />
    </Suspense>
  );
}
