import type { ProxyOptions } from "vite";

/** Imported only by the Node-side Vite configuration, never by browser application code. */
export function backendProxy(apiKey: string | undefined, target = "http://localhost:4000"): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    configure(proxy) {
      proxy.on("proxyReq", (request) => {
        request.removeHeader("X-API-Key");
        if (apiKey) request.setHeader("X-API-Key", apiKey);
      });
    },
  };
}
