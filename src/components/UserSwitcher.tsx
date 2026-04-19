'use client';

import { useEffect, useState } from 'react';
import { madrasaStore, Profile } from '@/lib/madrasa';
import Avatar from './Avatar';
import { Check, UsersRound } from 'lucide-react';

export default function UserSwitcher() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const s = madrasaStore();
    Promise.all([s.listAllProfiles(), s.getCurrentUser()]).then(([ps, me]) => {
      setProfiles(ps);
      setCurrentId(me?.id ?? null);
    });
  }, []);

  async function switchTo(userId: string) {
    await madrasaStore().setCurrentUser(userId);
    // Full reload pour que toutes les pages reprennent le nouvel user
    window.location.reload();
  }

  const current = profiles.find((p) => p.id === currentId);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-alt)] transition-colors"
      >
        <UsersRound size={20} className="text-[var(--primary)]" />
        <div className="flex-1 text-left">
          <div className="text-xs text-[var(--text-muted)]">Mode test — user actif</div>
          <div className="text-sm font-semibold text-[var(--text)]">
            {current?.pseudo ?? 'Aucun'}
          </div>
        </div>
        {current && <Avatar pseudo={current.pseudo} size="sm" />}
      </button>
      {open && (
        <div className="border-t border-[var(--border)]">
          {profiles.map((p) => {
            const active = p.id === currentId;
            return (
              <button
                key={p.id}
                onClick={() => switchTo(p.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-alt)] transition-colors ${
                  active ? 'bg-[var(--bg-alt)]' : ''
                }`}
              >
                <Avatar pseudo={p.pseudo} size="sm" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--text)]">{p.pseudo}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Code ami : {p.friend_code}
                  </div>
                </div>
                {active && <Check size={16} className="text-[var(--primary)]" />}
              </button>
            );
          })}
          <div className="px-4 py-2 text-[11px] text-[var(--text-muted)] bg-[var(--bg-alt)]">
            V1 test : switch d&apos;user simule plusieurs comptes. Avec Supabase, un seul user par
            appareil (via auth).
          </div>
        </div>
      )}
    </div>
  );
}
