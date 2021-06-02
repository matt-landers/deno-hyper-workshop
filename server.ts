import { Server } from "./hyperbole/index.ts";

const server = Server();

server.all("/", async (_req, res, _next) => {
  await res.send("Hello World!");
});

server.all("/json", async (_req, res, _next) => {
  await res.json({ hello: "World!" });
});

server.all("/body", async (req, res, _next) => {
  await res.json(req.body);
});

await server.listen({ port: 3000 });
