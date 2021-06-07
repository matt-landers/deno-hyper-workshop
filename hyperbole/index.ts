import { EventEmitter } from "https://deno.land/x/event@2.0.0/mod.ts";

export interface HyperboleRequest {
  url: URL;
  body?: unknown | string;
  method: string;
  pathname: string;
}

export type HyperboleNext = () => unknown;

export type HyperboleRequestHandler = (
  req: HyperboleRequest,
  res: HyperboleResponse,
  next: HyperboleNext
) => unknown;

async function hyperboleRequest(request: Request): Promise<HyperboleRequest> {
  const decoder = new TextDecoder();
  const raw = await request.body?.getReader().read();
  let body = decoder.decode(raw?.value);

  try {
    body = JSON.parse(body);
  } catch (_e) {
    //ignore
  }

  return {
    url: new URL(request.url),
    body,
    method: request.method,
    pathname: new URL(request.url).pathname,
  };
}

export type Events = {
  end: [];
};

class HyperboleResponse extends EventEmitter<Events> {
  public status = 200;

  constructor(
    private respondWith: (r: Response | Promise<Response>) => Promise<void>
  ) {
    super(0);
  }

  send(body?: string, status?: number, headers?: HeadersInit) {
    this.respondWith(new Response(body, { status: status ?? 200, headers }));
    this.status = status ?? 200;
    this.emit("end");
  }

  json(o: unknown, status?: number) {
    this.send(JSON.stringify(o), status ?? 200, {
      "Content-Type": "application/json",
    });
  }
}

export interface HyperboleServer {
  all(path: string, handler: HyperboleRequestHandler): unknown;
  use(handler: HyperboleRequestHandler): unknown;
  listen(options: { port: number }): unknown;
}

export const Server = (): HyperboleServer => {
  const requestHandlers: Array<{
    path: string;
    handler: HyperboleRequestHandler;
  }> = [];
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
        handled = true;
        const { handler } = rh;
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

  async function handleHttp(conn: Deno.Conn) {
    const httpConn = Deno.serveHttp(conn);
    try {
      for await (const { request, respondWith } of httpConn) {
        const req = await hyperboleRequest(request);
        const res = new HyperboleResponse(respondWith);

        // We do not need to await this because we won't do anything after
        void processRequest(req, res);
      }
    } catch (e) {
      console.log(e);
    }
  }

  async function waitForConnection(tcp: Deno.Listener) {
    for await (const c of tcp) {
      handleHttp(c);
    }
  }

  function all(path: string, handler: HyperboleRequestHandler) {
    requestHandlers.push({ path, handler });

    return server;
  }

  function use(handler: HyperboleRequestHandler) {
    all("*", handler);

    return server;
  }

  function listen(options: { port: number }) {
    const tcp = Deno.listen({ port: options.port });
    waitForConnection(tcp);

    return server;
  }

  return server;
};
