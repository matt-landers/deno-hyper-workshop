import { Server } from "./hyperbole/index.ts";

const server = Server();

server.all("*", (_req, res, next) => {
  console.log("Every request hits this.");

  res.on('end', () => {
    console.log('Response sent!');
  });

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
