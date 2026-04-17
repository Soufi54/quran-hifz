'use client';

const COLORS = ['#D4AF37', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#EC4899', '#14B8A6'];
const COUNT = 40;

export default function Confetti() {
  const particles = Array.from({ length: COUNT }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.8;
    const duration = 2 + Math.random() * 1.5;
    const size = 6 + Math.random() * 8;
    const color = COLORS[i % COLORS.length];
    const isCircle = Math.random() > 0.5;

    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${left}%`,
          top: '-10px',
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          borderRadius: isCircle ? '50%' : '2px',
          animation: `confettiDrop ${duration}s ease-in ${delay}s forwards`,
          opacity: 1,
        }}
      />
    );
  });

  return (
    <>
      <style>{`
        @keyframes confettiDrop {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100, overflow: 'hidden' }}>
        {particles}
      </div>
    </>
  );
}
