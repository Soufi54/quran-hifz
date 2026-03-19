export function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => ({ id: String(i + 1) }));
}

export default function SurahLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
