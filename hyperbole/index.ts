import { EventEmitter } from "https://deno.land/x/event@2.0.0/mod.ts";

export interface HyperboleRequest {
  url: URL;
  body?: BodyInit;
  method: string;
  pathname: string;
}

async function hyperboleRequest(request: Request): Promise<HyperboleRequest> {
  const decoder = new TextDecoder();
  const url = new URL(request.url);
  let body;

  if (request.method !== "GET") {
    const raw = await request.body?.getReader().read();
    body = decoder.decode(raw?.value);

    try {
      body = JSON.parse(body);
    } catch (_e) {
      //ignore
    }
  }

  return {
    url,
    body,
    method: request.method,
    pathname: url.pathname,
  };
}

export type HyperboleNext = () => unknown;

export type HyperboleRequestHandler = (
  req: HyperboleRequest,
  res: HyperboleResponse,
  next: HyperboleNext
) => unknown;

export type HyperboleEvents = {
  end: [];
};

class HyperboleResponse extends EventEmitter<HyperboleEvents> {
  public status = 200;

  constructor(private respondWith: Deno.RequestEvent["respondWith"]) {
    super(0);
  }

  public send(body?: string, status?: number, headers?: HeadersInit) {
    this.status = status ?? 200;
    this.respondWith(new Response(body, { status: this.status, headers }));
    this.emit("end");
  }

  public json(o: unknown, status?: number) {
    this.send(JSON.stringify(o), status ?? 200, {
      "Content-Type": "application/json",
    });
  }
}

export interface HyperboleServer {
  all(path: string, handler: HyperboleRequestHandler): HyperboleServer;
  use(handler: HyperboleRequestHandler): HyperboleServer;
  listen(port: number): HyperboleServer;
}

export function Server(): HyperboleServer {
  const requestHandlers: {
    path: string;
    handler: HyperboleRequestHandler;
  }[] = [];
  const server = {
    all,
    use,
    listen,
  };

  function callHandler(
    req: HyperboleRequest,
    res: HyperboleResponse,
    handler: HyperboleRequestHandler
  ) {
    return new Promise<boolean>((resolve, reject) => {
      let resolved = false;

      // If res.send is called
      (async () => {
        try {
          await res.once("end");
          if (!resolved) {
            resolve(false);
            resolved = true;
          }
        } catch (e) {
          reject(e);
        }
      })();

      // call the handler
      (async () => {
        try {
          await handler(req, res, () => {
            resolve(true);
            resolved = true;
          });
        } catch (e) {
          reject(e);
        }
      })();
    });
  }

  async function processRequest(req: HyperboleRequest, res: HyperboleResponse) {
    let handled = false;
    let ended = false;

    res.once("end", () => {
      ended = true;
    });

    for (const rh of requestHandlers) {
      if (rh.path === "*" || rh.path === req.url.pathname) {
        const { handler } = rh;
        handled = true;
        let next = false;

        try {
          next = await callHandler(req, res, handler);
        } catch (e) {
          console.log(e);
        }

        if (!next || ended) {
          break;
        }
      }
    }

    if (!handled) {
      res.send(undefined, 404);
    }
  }

  async function waitForConnection(port: number) {
    const tcp = Deno.listen({ port });
    for await (const c of tcp) {
      handleHttp(c);
    }
  }

  async function handleHttp(conn: Deno.Conn) {
    const httpConn = Deno.serveHttp(conn);

    for await (const { request, respondWith } of httpConn) {
      const req = await hyperboleRequest(request);
      const res = new HyperboleResponse(respondWith);

      // We do not need to await this because we won't do anything after
      void processRequest(req, res);
    }
  }

  function listen(port: number) {
    waitForConnection(port);

    return server;
  }

  function all(path: string, handler: HyperboleRequestHandler) {
    requestHandlers.push({ path, handler });

    return server;
  }

  function use(handler: HyperboleRequestHandler) {
    all("*", handler);

    return server;
  }

  return server;
}
