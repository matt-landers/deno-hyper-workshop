export interface HyperboleRequest {
  url: URL;
  body?: unknown | string;
}

export interface HyperboleResponse {
  send: (body: string, status?: number, headers?: HeadersInit) => void;
  json: (o: unknown, status?: number) => void;
}

export type HyperboleNext = () => Promise<unknown>;

export type HyperboleRequestHandler = (
  req: HyperboleRequest,
  res: HyperboleResponse,
  next: HyperboleNext
) => Promise<unknown>;

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
  };
}

function hyperboleResponse(
  respondWith: (r: Response | Promise<Response>) => Promise<void>
): HyperboleResponse {
  return {
    send(body: string, status?: number, headers?: HeadersInit) {
      respondWith(new Response(body, { status: status ?? 200, headers }));
    },
    json(o: unknown, status?: number) {
      this.send(JSON.stringify(o), status ?? 200, {
        "Content-Type": "application/json",
      });
    },
  };
}

export const Server = () => {
  const requestHandlers: Array<{
    path: string;
    handler: HyperboleRequestHandler;
  }> = [];

  function all(path: string, handler: HyperboleRequestHandler) {
    requestHandlers.push({ path, handler });
  }

  function use(handler: HyperboleRequestHandler) {
    all("*", handler);
  }

  async function handleHttp(conn: Deno.Conn) {
    const httpConn = Deno.serveHttp(conn);
    try {
      for await (const { request, respondWith } of httpConn) {
        const url = new URL(request.url);
        let handled = false;
        const req = await hyperboleRequest(request);
        const res = hyperboleResponse(respondWith);
        console.log(url.pathname);
        for (const rh of requestHandlers) {
          if (rh.path === "*" || rh.path === url.pathname) {
            const { handler } = rh;
            handler(req, res, async () => {});
            handled = true;
          }
        }
        if (!handled) {
          respondWith(
            new Response(null, {
              status: 404,
              headers: { "Cache-Control": "no-cache" },
            })
          );
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  async function listen(options: { port: number }) {
    const tcp = Deno.listen({ port: options.port });
    for await (const c of tcp) {
      handleHttp(c);
    }
  }
  return {
    all,
    use,
    listen,
  };
};
