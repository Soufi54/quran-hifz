export const onRequest: PagesFunction = ({ params, request }) => {
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const url = new URL(request.url);
  return Response.redirect(`${url.origin}/f/?code=${encodeURIComponent(code as string)}`, 302);
};
