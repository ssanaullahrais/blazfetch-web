import http from "node:http";
import type { AddressInfo } from "node:net";
import { createServer } from "vite";
import { describe, expect, it } from "vitest";
import { backendProxy } from "../../scripts/backend-proxy";

describe("server-only backend credential proxy", () => {
  it.each([undefined, "test-only-private-proxy-key-not-a-real-secret"])("replaces caller credentials and preserves streams with key %s", async (key) => {
    const observed: (string | undefined)[] = [];
    const backend = http.createServer((req, res) => {
      observed.push(req.headers["x-api-key"] as string | undefined);
      if (key && req.headers["x-api-key"] !== key) { res.writeHead(401).end(); return; }
      res.setHeader("Content-Type", req.url === "/api/events" ? "text/event-stream" : "application/octet-stream");
      res.setHeader("Set-Cookie", "blazfetch_dl_test=1; Path=/; SameSite=Lax");
      res.write(req.url === "/api/events" ? "data: first\n\n" : "media-first-");
      setTimeout(() => res.end(req.url === "/api/events" ? "data: second\n\n" : "second"), 10);
    });
    await new Promise<void>((resolve) => backend.listen(0, "127.0.0.1", resolve));
    const target = `http://127.0.0.1:${(backend.address() as AddressInfo).port}`;
    const vite = await createServer({ configFile: false, logLevel: "silent", server: { middlewareMode: true, proxy: { "/api": backendProxy(key, target) } } });
    const frontend = http.createServer(vite.middlewares);
    await new Promise<void>((resolve) => frontend.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${(frontend.address() as AddressInfo).port}`;
    try {
      for (const route of ["stream", "events"]) {
        const response = await fetch(`${base}/api/${route}`, { headers: { "X-API-Key": "untrusted-browser-value" } });
        expect(response.status).toBe(200);
        expect(response.headers.get("x-api-key")).toBeNull();
        expect(response.headers.get("set-cookie")).toContain("blazfetch_dl_test=1");
        expect(await response.text()).toBe(route === "events" ? "data: first\n\ndata: second\n\n" : "media-first-second");
      }
      expect(observed).toEqual([key, key]);
    } finally {
      frontend.closeAllConnections(); backend.closeAllConnections();
      await Promise.all([new Promise<void>((resolve) => frontend.close(() => resolve())), new Promise<void>((resolve) => backend.close(() => resolve())), vite.close()]);
    }
  });
});
