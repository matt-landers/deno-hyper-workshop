import { Server } from "./hyperbole/index.ts";

const server = Server();

server.all("*", (req, res, next) => {
  const start = Date.now();

  res.on("end", () => {
    const duration = Date.now() - start;
    console.log(`${res.status} ${req.method} ${req.pathname} ${duration}ms`);
  });

  next();
});

server.all("/", (_req, res, _next) => {
  res.send("Hello World!");
  console.log('Sending "Hello World!"');
});

server.all("/json", (_req, res, _next) => {
  res.json({ hello: "World!" });
  console.log('Sending { hello: "World!" }');
});

server.all("/body", (req, res, _next) => {
  res.json(req.body);
  console.log("Sending the body");
});

await server.listen({ port: 3000 });
