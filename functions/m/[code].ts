// Cloudflare Pages Function : redirige /m/ABCDEF vers /m/?code=ABCDEF
// _redirects avec ?code=:splat ne fonctionnait pas (Cloudflare gardait :splat litteral).
export const onRequest: PagesFunction = ({ params, request }) => {
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const url = new URL(request.url);
  return Response.redirect(`${url.origin}/m/?code=${encodeURIComponent(code as string)}`, 302);
};
