'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, UserPlus2, Check, X, Swords, Copy, Share2, Search } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import Avatar from '@/components/Avatar';
import { madrasaStore, Profile, Friendship } from '@/lib/madrasa';

type FriendLine = Friendship & { profile: Profile };

export default function AmisPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<FriendLine[]>([]);
  const [incoming, setIncoming] = useState<FriendLine[]>([]);
  const [addCode, setAddCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const s = madrasaStore();
    const [u, fs, incs] = await Promise.all([
      s.getCurrentUser(),
      s.listFriends(),
      s.listIncomingFriendRequests(),
    ]);
    setMe(u);
    setFriends(fs);
    setIncoming(incs);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    let mounted = true;
    madrasaStore()
      .searchProfilesByPseudo(q)
      .then((res) => {
        if (!mounted) return;
        setSearchResults(res.filter((p) => p.id !== me?.id));
      });
    return () => {
      mounted = false;
    };
  }, [searchQuery, me?.id]);

  async function sendByCode(e: React.FormEvent) {
    e.preventDefault();
    const code = addCode.trim().toUpperCase();
    if (!code) return;
    try {
      await madrasaStore().sendFriendRequest(code);
      setAddCode('');
      setFlash('Demande envoyee');
      setTimeout(() => setFlash(null), 2000);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setTimeout(() => setError(null), 3000);
    }
  }

  async function sendToUser(userId: string, pseudo: string) {
    try {
      await madrasaStore().sendFriendRequest(userId);
      setFlash(`Demande envoyee a ${pseudo}`);
      setTimeout(() => setFlash(null), 2000);
      setSearchQuery('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setTimeout(() => setError(null), 3000);
    }
  }

  async function accept(id: string) {
    await madrasaStore().acceptFriendRequest(id);
    refresh();
  }

  async function refuse(id: string) {
    await madrasaStore().removeFriend(id);
    refresh();
  }

  async function copyMyCode() {
    if (!me) return;
    try {
      await navigator.clipboard.writeText(me.friend_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function shareMyLink() {
    if (!me || typeof window === 'undefined') return;
    const url = `${window.location.origin}/f/${me.friend_code}`;
    const text = `Ajoute-moi sur Quran Hifz : ${url}`;
    if ('share' in navigator) {
      try {
        await (
          navigator as Navigator & { share: (d: { text: string; url: string }) => Promise<void> }
        ).share({ text, url });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
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
        <h1 className="text-xl font-bold text-[var(--text)]">Mes amis</h1>
      </header>

      {/* Mon code */}
      {me && (
        <section className="px-4 mb-4">
          <div className="rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 p-4">
            <div className="text-xs text-[var(--text-muted)] mb-1">Mon code ami</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-2xl font-bold tracking-widest text-[var(--primary)]">
                {me.friend_code}
              </div>
              <button
                onClick={copyMyCode}
                className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
              <button
                onClick={shareMyLink}
                className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]"
              >
                <Share2 size={16} />
              </button>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-2">
              Partage pour qu&apos;on t&apos;ajoute. Les defis 1v1 fonctionnent meme hors madrasa.
            </div>
          </div>
        </section>
      )}

      {/* Ajouter par code */}
      <section className="px-4 mb-4">
        <form onSubmit={sendByCode} className="flex gap-2">
          <input
            type="text"
            value={addCode}
            onChange={(e) => setAddCode(e.target.value.toUpperCase())}
            placeholder="Code ami (ex: AHMED8)"
            maxLength={6}
            className="flex-1 px-3 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] tracking-widest font-mono focus:outline-none focus:border-[var(--primary)]"
          />
          <button
            type="submit"
            disabled={addCode.length !== 6}
            className="px-4 rounded-xl bg-[var(--primary)] text-white font-semibold disabled:opacity-50"
          >
            <UserPlus2 size={18} />
          </button>
        </form>
      </section>

      {/* Recherche par pseudo */}
      <section className="px-4 mb-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Chercher @pseudo"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
          />
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden">
            {searchResults.map((p) => (
              <button
                key={p.id}
                onClick={() => sendToUser(p.id, p.pseudo)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--bg-alt)] text-left"
              >
                <Avatar pseudo={p.pseudo} size="sm" />
                <div className="flex-1">
                  <div className="font-medium text-[var(--text)]">{p.pseudo}</div>
                  <div className="text-xs text-[var(--text-muted)]">{p.friend_code}</div>
                </div>
                <UserPlus2 size={16} className="text-[var(--primary)]" />
              </button>
            ))}
          </div>
        )}
      </section>

      {flash && (
        <div className="mx-4 mb-3 rounded-xl p-3 bg-green-50 text-green-700 text-sm dark:bg-green-900/20 dark:text-green-300">
          {flash}
        </div>
      )}
      {error && (
        <div className="mx-4 mb-3 rounded-xl p-3 bg-red-50 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Demandes recues */}
      {incoming.length > 0 && (
        <section className="px-4 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
            Demandes recues
          </h2>
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden">
            {incoming.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 px-3 py-3 border-b border-[var(--border)] last:border-b-0"
              >
                <Avatar pseudo={f.profile.pseudo} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text)] truncate">
                    {f.profile.pseudo}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    veut t&apos;ajouter en ami
                  </div>
                </div>
                <button
                  onClick={() => accept(f.id)}
                  className="p-2 rounded-lg bg-[var(--primary)] text-white"
                  aria-label="Accepter"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => refuse(f.id)}
                  className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)]"
                  aria-label="Refuser"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mes amis */}
      <section className="px-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
          Mes amis ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-[var(--text-muted)]">
            Pas encore d&apos;ami. Partage ton code pour commencer.
          </div>
        ) : (
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden">
            {friends.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 px-3 py-3 border-b border-[var(--border)] last:border-b-0"
              >
                <Avatar pseudo={f.profile.pseudo} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text)] truncate">
                    {f.profile.pseudo}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">{f.profile.friend_code}</div>
                </div>
                <Link
                  href={`/defis/nouveau?opponent=${f.profile.id}`}
                  className="p-2 rounded-lg bg-[var(--primary)] text-white"
                  aria-label="Defier"
                >
                  <Swords size={16} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
