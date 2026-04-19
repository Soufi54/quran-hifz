import { avatarColor, avatarInitial } from '@/lib/madrasa';

interface AvatarProps {
  pseudo: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_PX: Record<NonNullable<AvatarProps['size']>, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const FONT_PX: Record<NonNullable<AvatarProps['size']>, number> = {
  xs: 11,
  sm: 14,
  md: 17,
  lg: 24,
  xl: 34,
};

export default function Avatar({ pseudo, size = 'md', className = '' }: AvatarProps) {
  const s = SIZE_PX[size];
  const color = avatarColor(pseudo || '?');
  const letter = avatarInitial(pseudo);
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full text-white font-semibold select-none ${className}`}
      style={{
        width: s,
        height: s,
        backgroundColor: color,
        fontSize: FONT_PX[size],
        lineHeight: 1,
      }}
      aria-label={`Avatar de ${pseudo}`}
    >
      {letter}
    </div>
  );
}
