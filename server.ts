const tcp = Deno.listen({ port: 3000 });
for await (const c of tcp) {
  handleHttp(c);
}

async function handleHttp(conn: Deno.Conn) {
  for await (const { request, respondWith } of Deno.serveHttp(conn)) {
    respondWith(new Response("Hello World!"));
  }
}
