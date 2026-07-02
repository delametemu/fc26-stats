import type { ClubDetails, ClubSearchResult, Match, MemberStats, OverallStats, Platform } from "./types.js";
import { cacheKey, getCached, setCache } from "./cache.js";
import { pickClubStats, parseForm } from "./normalize.js";

const BASE_URL = "https://proclubs.ea.com/api/fc";
const DEFAULT_PLATFORM: Platform = "common-gen4";

const HEADERS: Record<string, string> = {
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://www.ea.com",
  Referer: "https://www.ea.com/games/ea-sports-fc/clubs/rankings",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

const CACHE_TTL = {
  search: 120_000,
  club: 60_000,
  members: 60_000,
  matches: 45_000,
  leaderboard: 180_000,
};

async function eaFetch<T>(endpoint: string, params: Record<string, string | number>, ttlMs: number): Promise<T> {
  const key = cacheKey(endpoint, params);
  const cached = getCached<T>(key);
  if (cached) return cached;

  const url = new URL(`${BASE_URL}/${endpoint.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const response = await fetch(url.toString(), { headers: HEADERS });
  if (!response.ok) {
    throw new Error(`EA API error ${response.status} for ${endpoint}`);
  }

  const data = (await response.json()) as T;
  setCache(key, data, ttlMs);
  return data;
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
