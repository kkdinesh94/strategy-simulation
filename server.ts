/**
 * Local development / self-hosted server.
 *
 * Every /api request is handed to the same handler Cloudflare Pages runs in production
 * (functions/api/[[route]].ts), backed by a local SQLite file through a D1-compatible
 * adapter. There is deliberately no second copy of the API here.
 */
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createLocalD1 } from "./server/d1Adapter";
import { onRequest } from "./functions/api/[[route]]";

dotenv.config();

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const app = express();
  const env = {
    DB: createLocalD1(),
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    NODE_ENV: process.env.NODE_ENV
  };

  app.use("/api", express.raw({ type: "*/*", limit: "25mb" }), async (req, res) => {
    try {
      const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === "string") headers.set(key, value);
        else if (Array.isArray(value)) headers.set(key, value.join(", "));
      }
      const hasBody = !["GET", "HEAD"].includes(req.method) && Buffer.isBuffer(req.body) && req.body.length > 0;
      const request = new Request(url, { method: req.method, headers, body: hasBody ? req.body : undefined });
      const response = await onRequest({ request, env, params: {} });
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.send(Buffer.from(await response.arrayBuffer()));
    } catch (err: any) {
      console.error("API error:", err);
      res.status(500).json({ error: err?.message || "Server error" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EV Venture League running on http://localhost:${PORT}`);
  });
}

startServer();
