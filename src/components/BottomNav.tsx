'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Star, BookOpen, TrendingUp, User } from 'lucide-react';

const tabs = [
  { href: '/', label: 'Challenge', Icon: Star },
  { href: '/sourates', label: 'Sourates', Icon: BookOpen },
  { href: '/progression', label: 'Progression', Icon: TrendingUp },
  { href: '/profil', label: 'Profil', Icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="bg-white/95 backdrop-blur-md border-t border-[#E2EBE8] flex" style={{ boxShadow: '0 -4px 20px rgba(13, 92, 77, 0.04)' }}>
        {tabs.map(tab => {
          const active = tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center py-3 cursor-pointer transition-colors duration-200 ${
                active ? 'text-[#0D5C4D]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <tab.Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className={`text-[10px] mt-1 ${active ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
              {active && (
                <div className="w-1 h-1 rounded-full bg-[#C9A84C] mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
