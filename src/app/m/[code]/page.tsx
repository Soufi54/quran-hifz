// Legacy route. Real page is /m/?code=..., this placeholder exists so Next.js' output:export
// build doesn't fail. Cloudflare _redirects maps /m/:code -> /m/?code=:code at runtime.
export function generateStaticParams() {
  return [{ code: '_placeholder_' }];
}

export const dynamicParams = false;

export default function LegacyMPage() {
  return null;
}
