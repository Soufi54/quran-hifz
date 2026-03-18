'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Challenge', icon: '⭐' },
  { href: '/sourates', label: 'Sourates', icon: '📖' },
  { href: '/progression', label: 'Progression', icon: '📊' },
  { href: '/profil', label: 'Profil', icon: '👤' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-[480px] mx-auto flex">
        {tabs.map(tab => {
          const active = tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs ${
                active ? 'text-[#1B4332] font-semibold' : 'text-gray-400'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
