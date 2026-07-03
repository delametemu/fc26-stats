import type { ClubDetails, ClubSearchResult, Match, MemberStats, OverallStats, Platform } from "./types.js";
import { cacheKey, getCached, setCache } from "./cache.js";
import { pickClubStats, parseForm } from "./normalize.js";

const BASE_URL = "https://proclubs.ea.com/api/fc";
const DEFAULT_PLATFORM: Platform = "common-gen4";

// Rotate between multiple user agents to avoid detection
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    Origin: "https://www.ea.com",
    Referer: "https://www.ea.com/games/ea-sports-fc/clubs/rankings",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "User-Agent": getRandomUserAgent(),
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  };
}

const CACHE_TTL = {
  search: 120_000,
  club: 60_000,
  members: 60_000,
  matches: 45_000,
  leaderboard: 180_000,
};

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1500; // 1.5 seconds

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function eaFetch<T>(endpoint: string, params: Record<string, string | number>, ttlMs: number): Promise<T> {
  const key = cacheKey(endpoint, params);
  const cached = getCached<T>(key);
  if (cached) return cached;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const url = new URL(`${BASE_URL}/${endpoint.replace(/^\//, "")}`);
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, String(v));
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(url.toString(), {
          headers: getHeaders(),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorMsg = `EA API error ${response.status} for ${endpoint}`;
          lastError = new Error(errorMsg);

          // Retry on 403, 404, 429 (rate limit), 502, 503, 504 (server errors)
          // Include 404 as EA API sometimes returns it temporarily
          const retryableStatuses = [403, 404, 429, 502, 503, 504];
          if (retryableStatuses.includes(response.status) && attempt < MAX_RETRIES) {
            const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
            console.log(`[Attempt ${attempt + 1}/${MAX_RETRIES + 1}] Got ${response.status}, retrying ${endpoint} in ${delayMs}ms...`);
            await delay(delayMs);
            continue;
          }

          throw lastError;
        }

        // Check Content-Type to ensure we're getting JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const bodyPreview = await response.text();
          const preview = bodyPreview.substring(0, 100);
          const msg = `Expected JSON from ${endpoint}, got ${contentType || "unknown"}: ${preview}`;
          lastError = new Error(msg);

          // Retry on unexpected content type (might be temporary)
          if (attempt < MAX_RETRIES) {
            const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
            console.log(`[Attempt ${attempt + 1}/${MAX_RETRIES + 1}] Got non-JSON response, retrying in ${delayMs}ms...`);
            await delay(delayMs);
            continue;
          }

          throw lastError;
        }

        const data = (await response.json()) as T;
        setCache(key, data, ttlMs);
        return data;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      if (attempt < MAX_RETRIES) {
        const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.log(`[Attempt ${attempt + 1}/${MAX_RETRIES + 1}] Error fetching ${endpoint}, retrying in ${delayMs}ms:`, lastError.message);
        await delay(delayMs);
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${endpoint} after ${MAX_RETRIES + 1} attempts`);
}

export async function searchClubs(name: string, platform: Platform = DEFAULT_PLATFORM): Promise<ClubSearchResult[]> {
  if (!name.trim()) return [];
  return eaFetch<ClubSearchResult[]>("allTimeLeaderboard/search", { platform, clubName: name.trim() }, CACHE_TTL.search);
}

export async function getClubInfo(clubId: string, platform: Platform = DEFAULT_PLATFORM): Promise<ClubDetails> {
  return eaFetch<ClubDetails>("clubs/info", { platform, clubIds: clubId }, CACHE_TTL.club);
}

export async function getOverallStats(clubId: string, platform: Platform = DEFAULT_PLATFORM): Promise<OverallStats> {
  return eaFetch<OverallStats>("clubs/overallStats", { platform, clubIds: clubId }, CACHE_TTL.club);
}

export async function getMemberStats(clubId: string, platform: Platform = DEFAULT_PLATFORM): Promise<{ members: MemberStats[] }> {
  return eaFetch<{ members: MemberStats[] }>("members/stats", { platform, clubId }, CACHE_TTL.members);
}

export async function getMemberCareerStats(clubId: string, platform: Platform = DEFAULT_PLATFORM): Promise<{ members: MemberStats[] }> {
  return eaFetch<{ members: MemberStats[] }>("members/career/stats", { platform, clubId }, CACHE_TTL.members);
}

export async function getClubMatches(
  clubId: string,
  matchType: "friendlyMatch" | "leagueMatch" | "playoffMatch",
  maxResultCount = 10,
  platform: Platform = DEFAULT_PLATFORM,
): Promise<Match[]> {
  return eaFetch<Match[]>(
    "clubs/matches",
    { platform, clubIds: clubId, matchType, maxResultCount },
    CACHE_TTL.matches,
  );
}

export async function getLeaderboard(
  type: "allTime" | "currentSeason" = "allTime",
  platform: Platform = DEFAULT_PLATFORM,
  maxResultCount = 50,
): Promise<ClubSearchResult[]> {
  const endpoint = type === "allTime" ? "allTimeLeaderboard" : "currentSeasonLeaderboard";
  return eaFetch<ClubSearchResult[]>(endpoint, { platform, maxResultCount }, CACHE_TTL.leaderboard);
}

export async function getClubDashboard(clubId: string, platform: Platform = DEFAULT_PLATFORM) {
  const [info, overallStatsRaw, memberStats, careerStats, league, playoff, friendly] = await Promise.all([
    getClubInfo(clubId, platform).catch(() => ({} as ClubDetails)),
    getOverallStats(clubId, platform).catch(() => [] as OverallStats),
    getMemberStats(clubId, platform).catch(() => ({ members: [] as MemberStats[] })),
    getMemberCareerStats(clubId, platform).catch(() => ({ members: [] as MemberStats[] })),
    getClubMatches(clubId, "leagueMatch", 10, platform).catch(() => [] as Match[]),
    getClubMatches(clubId, "playoffMatch", 10, platform).catch(() => [] as Match[]),
    getClubMatches(clubId, "friendlyMatch", 10, platform).catch(() => [] as Match[]),
  ]);

  const stats = pickClubStats(overallStatsRaw, clubId);
  const formCodes = stats
    ? [stats.lastMatch0, stats.lastMatch1, stats.lastMatch2, stats.lastMatch3, stats.lastMatch4,
       stats.lastMatch5, stats.lastMatch6, stats.lastMatch7, stats.lastMatch8, stats.lastMatch9]
    : [];

  return {
    clubId,
    info: info[clubId] ?? info[String(clubId)] ?? null,
    overallStats: stats,
    memberStats: memberStats.members ?? [],
    careerStats: careerStats.members ?? [],
    recentMatches: { league, playoff, friendly },
    form: parseForm(formCodes),
    fetchedAt: new Date().toISOString(),
    platform,
  };
}
