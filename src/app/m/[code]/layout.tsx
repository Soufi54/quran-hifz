export function generateStaticParams() {
  return [{ code: '_placeholder_' }];
}

export const dynamicParams = false;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
