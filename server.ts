import { Server } from "./hyperbole/index.ts";

const server = Server();

server.all("*", (_req, _res, next) => {
  console.log("Every request hits this.");
  next();
});

server.all("/", (_req, res, _next) => {
  console.log('Sending "Hello World!"');
  res.send("Hello World!");
});

server.all("/json", (_req, res, _next) => {
  console.log('Sending { hello: "World!" }');
  res.json({ hello: "World!" });
});

server.all("/body", (req, res, _next) => {
  console.log("Sending the body");
  res.json(req.body);
});

await server.listen({ port: 3000 });
