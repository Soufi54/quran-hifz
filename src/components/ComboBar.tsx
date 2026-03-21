'use client';

import { useEffect, useState } from 'react';

interface ComboBarProps {
  combo: number;
  multiplier: number;
  showConfetti: boolean;
}

function Confetti() {
  const particles = Array.from({ length: 18 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const duration = 1.5 + Math.random() * 1;
    const size = 6 + Math.random() * 6;
    const colors = ['#D4AF37', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6'];
    const color = colors[i % colors.length];
    const rotation = Math.random() * 360;

    return (
      <span
        key={i}
        className="confetti-particle"
        style={{
          position: 'absolute',
          left: `${left}%`,
          top: '-8px',
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          animation: `confettiFall ${duration}s ease-in ${delay}s forwards`,
          transform: `rotate(${rotation}deg)`,
          opacity: 1,
        }}
      />
    );
  });

  return <div className="absolute inset-0 overflow-hidden pointer-events-none">{particles}</div>;
}

export default function ComboBar({ combo, multiplier, showConfetti }: ComboBarProps) {
  const [animate, setAnimate] = useState(false);
  const [prevCombo, setPrevCombo] = useState(combo);

  useEffect(() => {
    if (combo > prevCombo) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 400);
      setPrevCombo(combo);
      return () => clearTimeout(timer);
    }
    setPrevCombo(combo);
  }, [combo, prevCombo]);

  if (combo < 2) return null;

  const isGold = combo >= 5;
  const isIncredible = combo >= 10;

  const barBg = isIncredible
    ? 'bg-gradient-to-r from-purple-600 via-yellow-500 to-purple-600'
    : isGold
      ? 'bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600'
      : 'bg-gradient-to-r from-emerald-700 to-emerald-500';

  const textColor = isIncredible ? 'text-white' : isGold ? 'text-yellow-900' : 'text-white';

  const pulseClass = isGold ? 'animate-combo-pulse' : '';
  const entryClass = animate ? 'animate-combo-bump' : '';

  return (
    <div className="relative w-full">
      {showConfetti && <Confetti />}
      <div
        className={[
          'relative mx-auto max-w-md rounded-xl px-4 py-2',
          'bg-black/60 backdrop-blur-sm',
          'flex items-center justify-between',
          'transition-all duration-300',
          pulseClass,
          entryClass,
          isGold ? 'shadow-[0_0_16px_rgba(212,175,55,0.5)]' : '',
        ].join(' ')}
      >
        {isGold && (
          <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent animate-combo-shine" />
          </div>
        )}

        <div className="flex items-center gap-3">
          <div
            className={[
              'rounded-lg px-3 py-1 font-bold text-sm tracking-wide',
              barBg,
              textColor,
            ].join(' ')}
          >
            COMBO x{combo}
          </div>

          {isIncredible && (
            <span className="text-yellow-300 font-extrabold text-sm tracking-widest animate-pulse">
              INCREDIBLE!
            </span>
          )}
        </div>

        <div className="text-sm font-semibold text-[#D4AF37]">
          XP x{multiplier}
        </div>
      </div>

      <style jsx>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(260px) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes comboPulse {
          0%, 100% {
            box-shadow: 0 0 8px rgba(212, 175, 55, 0.4);
          }
          50% {
            box-shadow: 0 0 24px rgba(212, 175, 55, 0.8);
          }
        }
        @keyframes comboBump {
          0% {
            transform: scale(1);
          }
          30% {
            transform: scale(1.08);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes comboShine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        :global(.animate-combo-pulse) {
          animation: comboPulse 1.5s ease-in-out infinite;
        }
        :global(.animate-combo-bump) {
          animation: comboBump 0.4s ease-out;
        }
        :global(.animate-combo-shine) {
          animation: comboShine 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
