import { serve } from "https://deno.land/std@0.97.0/http/server.ts";

const server = serve({ port: 3001 });

for await (const req of server) {
  req.respond({ status: 200, body: "Hello World" });
}
