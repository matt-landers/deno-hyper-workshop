export interface HyperboleRequest {
  url: string;
}

export interface HyperboleResponse {
  sendStatus: (status: number) => void;
}

export type HyperboleNext = () => Promise<unknown>;

export type HyperboleRequestHandler = (
  req: HyperboleRequest,
  res: HyperboleResponse,
  next: HyperboleNext
) => Promise<unknown> | unknown;

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
  async function listen(options: { port: number }) {
    const tcp = Deno.listen({ port: options.port });
    for await (const c of tcp) {
      handleHttp(c);
    }

    async function handleHttp(conn: Deno.Conn) {
      for await (const { request, respondWith } of Deno.serveHttp(conn)) {
        const url = new URL(request.url);
        for (const rh of requestHandlers) {
          if (rh.path === "*" || rh.path === url.pathname) {
            const { handler } = rh;
            //await handler(req, res, goNext);
          }
        }
      }
    }
  }
  return {
    all,
    use,
    listen,
  };
};
