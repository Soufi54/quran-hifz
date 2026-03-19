export function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => ({ surahId: String(i + 1) }));
}

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
