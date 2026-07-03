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
import {
  addClip,
  addNigerianAward,
  archiveMatches,
  getClips,
  getNigerianAwards,
  getNigerianCounts,
  getPotd,
  getPotdHistory,
  getSavedMatches,
  removeClip,
  removeNigerianAward,
  todayKey,
  votePotd,
} from "./store.js";

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
    // Archive every match we ever see so history survives past EA's 10-match window
    archiveMatches(clubId, dashboard.recentMatches.league, "leagueMatch");
    archiveMatches(clubId, dashboard.recentMatches.playoff, "playoffMatch");
    archiveMatches(clubId, dashboard.recentMatches.friendly, "friendlyMatch");
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
    archiveMatches(clubId, matches, matchType);
    return c.json({ matches, matchType });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load matches";
    return c.json({ error: message }, 502);
  }
});

// ---------- Nigerian of the Match ----------

app.get("/api/club/:clubId/nigerian", (c) => {
  const clubId = c.req.param("clubId");
  return c.json({
    awards: getNigerianAwards(clubId),
    leaderboard: getNigerianCounts(clubId),
  });
});

app.post("/api/club/:clubId/nigerian", async (c) => {
  const clubId = c.req.param("clubId");
  const body = await c.req.json().catch(() => null);
  const playerName = typeof body?.playerName === "string" ? body.playerName.trim() : "";
  if (!playerName) {
    return c.json({ error: "playerName is required" }, 400);
  }
  const award = addNigerianAward(clubId, playerName, body?.matchId, body?.opponentName, body?.note);
  return c.json({
    award,
    awards: getNigerianAwards(clubId),
    leaderboard: getNigerianCounts(clubId),
  });
});

app.delete("/api/club/:clubId/nigerian/:awardId", (c) => {
  const clubId = c.req.param("clubId");
  const removed = removeNigerianAward(clubId, c.req.param("awardId"));
  if (!removed) return c.json({ error: "Award not found" }, 404);
  return c.json({
    awards: getNigerianAwards(clubId),
    leaderboard: getNigerianCounts(clubId),
  });
});

// ---------- Plur of the Day ----------

app.get("/api/club/:clubId/potd", (c) => {
  const clubId = c.req.param("clubId");
  const date = c.req.query("date") ?? todayKey();
  const voterId = c.req.query("voterId") ?? undefined;
  return c.json({
    today: getPotd(clubId, date, voterId),
    history: getPotdHistory(clubId),
  });
});

app.post("/api/club/:clubId/potd/vote", async (c) => {
  const clubId = c.req.param("clubId");
  const body = await c.req.json().catch(() => null);
  const playerName = typeof body?.playerName === "string" ? body.playerName.trim() : "";
  const voterId = typeof body?.voterId === "string" ? body.voterId.trim() : "";
  if (!playerName || !voterId) {
    return c.json({ error: "playerName and voterId are required" }, 400);
  }
  return c.json({
    today: votePotd(clubId, playerName, voterId),
    history: getPotdHistory(clubId),
  });
});

// ---------- Match clips ----------

app.get("/api/club/:clubId/clips", (c) => {
  const clubId = c.req.param("clubId");
  return c.json({ clips: getClips(clubId) });
});

app.post("/api/club/:clubId/clips", async (c) => {
  const clubId = c.req.param("clubId");
  const body = await c.req.json().catch(() => null);
  const matchId = typeof body?.matchId === "string" ? body.matchId.trim() : "";
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!matchId || !url) {
    return c.json({ error: "matchId and url are required" }, 400);
  }
  if (!/^https?:\/\//i.test(url)) {
    return c.json({ error: "url must start with http:// or https://" }, 400);
  }
  const clip = addClip(clubId, matchId, url, body?.title);
  return c.json({ clip, clips: getClips(clubId) });
});

app.delete("/api/club/:clubId/clips/:clipId", (c) => {
  const clubId = c.req.param("clubId");
  const removed = removeClip(clubId, c.req.param("clipId"));
  if (!removed) return c.json({ error: "Clip not found" }, 404);
  return c.json({ clips: getClips(clubId) });
});

// ---------- Saved match archive ----------

app.get("/api/club/:clubId/saved-matches", (c) => {
  const clubId = c.req.param("clubId");
  const saved = getSavedMatches(clubId);
  return c.json({ matches: saved, count: saved.length });
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
