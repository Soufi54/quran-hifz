export function generateStaticParams() {
  return [{ id: '_placeholder_' }];
}

export const dynamicParams = false;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
