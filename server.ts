import { Server } from "./hyperbole/index.ts";

Server()
  .use((req, res, next) => {
    const start = Date.now();

    res.on("end", () => {
      const duration = Date.now() - start;
      console.log(`${res.status} ${req.method} ${req.pathname} ${duration}ms`);
    });

    next();
  })
  .all("/", (_req, res, _next) => {
    res.send("Hello World!");
  })
  .all("/json", (req, res, _next) => {
    res.json(req.body);
  })
  .all("/hello", (_req, res, _next) => {
    res.send("World!");
  })
  .listen(3000);
