interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  variant?: 'mark' | 'mono'; // mark = carre + q, mono = juste le q en couleur courante
}

export default function Logo({ size = 32, className = '', showText = false, variant = 'mark' }: LogoProps) {
  const radius = Math.round(size * 0.22);
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {variant === 'mark' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          width={size}
          height={size}
          aria-label="Quran Hifz"
          style={{ borderRadius: radius }}
        >
          <rect width="512" height="512" rx="112" fill="#0D5C4D" />
          <text
            x="256"
            y="256"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif"
            fontWeight={700}
            fontSize={280}
            letterSpacing={-8}
            fill="#FFFFFF"
          >
            q
          </text>
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          width={size}
          height={size}
          aria-label="Quran Hifz"
        >
          <text
            x="256"
            y="256"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif"
            fontWeight={700}
            fontSize={400}
            letterSpacing={-12}
            fill="currentColor"
          >
            q
          </text>
        </svg>
      )}
      {showText && (
        <span className="font-semibold text-[var(--text)]" style={{ fontSize: size * 0.5, letterSpacing: '-0.02em' }}>
          Quran Hifz
        </span>
      )}
    </div>
  );
}
