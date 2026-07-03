import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createServer as createViteServer } from "vite";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import {
  getClubDashboard,
  getClubMatches,
  getLeaderboard,
  getMemberStats,
  searchClubs,
} from "./ea-client.js";
import type { MatchType, Platform } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT) || 3000;

const app = new Hono();

app.use("/api/*", cors());

app.get("/api/health", (c) => c.json({ ok: true, timestamp: new Date().toISOString() }));

app.get("/api/search", async (c) => {
  const name = c.req.query("name") ?? "";
  const platform = (c.req.query("platform") ?? "common-gen4") as Platform;
  try {
    const results = await searchClubs(name, platform);
    return c.json({ results, platform });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return c.json({ error: message }, 502);
  }
});

app.get("/api/club/:clubId", async (c) => {
  const clubId = c.req.param("clubId");
  const platform = (c.req.query("platform") ?? "common-gen4") as Platform;
  try {
    const dashboard = await getClubDashboard(clubId, platform);
    return c.json(dashboard);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load club";
    return c.json({ error: message }, 502);
  }
});

app.get("/api/club/:clubId/members", async (c) => {
  const clubId = c.req.param("clubId");
  const platform = (c.req.query("platform") ?? "common-gen4") as Platform;
  try {
    const data = await getMemberStats(clubId, platform);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load members";
    return c.json({ error: message }, 502);
  }
});

app.get("/api/club/:clubId/matches", async (c) => {
  const clubId = c.req.param("clubId");
  const platform = (c.req.query("platform") ?? "common-gen4") as Platform;
  const matchType = (c.req.query("type") ?? "leagueMatch") as MatchType;
  const count = Number(c.req.query("count") ?? 10);
  try {
    const matches = await getClubMatches(clubId, matchType, count, platform);
    return c.json({ matches, matchType });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load matches";
    return c.json({ error: message }, 502);
  }
});

app.get("/api/leaderboard", async (c) => {
  const platform = (c.req.query("platform") ?? "common-gen4") as Platform;
  const type = (c.req.query("type") ?? "allTime") as "allTime" | "currentSeason";
  const count = Number(c.req.query("count") ?? 50);
  try {
    const results = await getLeaderboard(type, platform, count);
    return c.json({ results, platform, type });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load leaderboard";
    return c.json({ error: message }, 502);
  }
});

if (isProd) {
  app.use("/*", serveStatic({ root: path.join(__dirname, "../dist") }));
  app.get("*", async (c) => {
    try {
      const indexPath = path.join(__dirname, "../dist/index.html");
      const html = fs.readFileSync(indexPath, "utf-8");
      c.header("Content-Type", "text/html");
      return c.body(html);
    } catch (err) {
      console.error("Failed to serve index.html:", err);
      return c.text("Internal Server Error", 500);
    }
  });
}

async function pipeHono(req: http.IncomingMessage, res: http.ServerResponse) {
  const host = req.headers.host ?? "localhost";
  const url = `http://${host}${req.url ?? "/"}`;

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const response = await app.fetch(
    new Request(url, {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    }),
  );

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    res.setHeader(key, value);
  });

  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}

async function start() {
  const vite = isProd
    ? null
    : await createViteServer({
        server: { middlewareMode: true },
        appType: "custom",
      });

  const server = http.createServer((req, res) => {
    const url = req.url || "/";

    // In production, always route through Hono (which handles both API and static files)
    if (isProd) {
      pipeHono(req, res).catch((err) => {
        console.error(err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      });
      return;
    }

    // In development: handle API requests directly, use Vite for everything else
    if (url.startsWith("/api")) {
      pipeHono(req, res).catch((err) => {
        console.error(err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      });
      return;
    }

    // In development, use Vite middleware
    if (vite) {
      vite.middlewares(req, res, async () => {
        // Fallback: when Vite middleware doesn't handle it, serve index.html
        try {
          const indexPath = path.join(__dirname, "../index.html");
          const html = await vite.transformIndexHtml(url, fs.readFileSync(indexPath, "utf-8"));
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html");
          res.end(html);
        } catch (err) {
          console.error("Failed to serve index.html:", err);
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      });
      return;
    }

    // Fallback (shouldn't reach here in dev)
    pipeHono(req, res).catch((err) => {
      console.error(err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    });
  });

  server.listen(PORT, () => {
    console.log(`FC26 Stats running at http://localhost:${PORT}`);
  });
}

start().catch(console.error);
