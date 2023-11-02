const OPENAI_API_HOST = "api.openai.com";

Deno.serve((req) => {
  const url = new URL(req.url);
  if (url.pathname === "/") {
    return new Response("404 Page Not Found", { status: 404 });
  }

  url.host = OPENAI_API_HOST;
  return fetch(url, req);
});
