interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

// Logo minimaliste : livre ouvert geometrique + croissant discret au-dessus.
// currentColor pour heriter la couleur du parent.
export default function Logo({ size = 32, className = '', showText = false }: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        aria-label="Quran Hifz"
      >
        <path d="M32 18 L32 52" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
        <path
          d="M32 18 C28 16, 20 15, 12 18 L12 48 C20 45, 28 46, 32 48"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M32 18 C36 16, 44 15, 52 18 L52 48 C44 45, 36 46, 32 48"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M29 8 A4 4 0 1 0 33 11"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {showText && (
        <span className="font-semibold text-[var(--text)]" style={{ fontSize: size * 0.5, letterSpacing: '-0.01em' }}>
          Quran Hifz
        </span>
      )}
    </div>
  );
}
