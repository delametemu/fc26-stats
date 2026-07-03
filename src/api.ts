import type { ClubDashboard, ClubSearchResult, Platform } from "./types";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path);
  
  if (!res.ok) {
    const contentType = res.headers.get("content-type");
    
    // Try to get error message from JSON response
    if (contentType?.includes("application/json")) {
      try {
        const data = await res.json();
        throw new Error(data.error ?? `Request failed with status ${res.status}`);
      } catch (err) {
        if (err instanceof Error && err.message.includes("Unexpected token")) {
          throw new Error(`API server error (${res.status}). Please try again.`);
        }
        throw err;
      }
    } else {
      // Non-JSON response (likely error page)
      throw new Error(`API server error (${res.status}). The service may be temporarily unavailable.`);
    }
  }

  const contentType = res.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    throw new Error("Invalid response format from server. Please try again.");
  }

  try {
    const data = await res.json();
    return data as T;
  } catch (err) {
    throw new Error("Failed to parse server response. Please try again.");
  }
}

export function searchClubs(name: string, platform: Platform) {
  const params = new URLSearchParams({ name, platform });
  return apiFetch<{ results: ClubSearchResult[] }>(`/api/search?${params}`);
}

export function getClubDashboard(clubId: string, platform: Platform) {
  const params = new URLSearchParams({ platform });
  return apiFetch<ClubDashboard>(`/api/club/${clubId}?${params}`);
}

export function getLeaderboard(platform: Platform, type: "allTime" | "currentSeason" = "allTime") {
  const params = new URLSearchParams({ platform, type, count: "25" });
  return apiFetch<{ results: ClubSearchResult[] }>(`/api/leaderboard?${params}`);
}

export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function pct(n: string | number | undefined): string {
  if (n === undefined || n === "") return "—";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(num)) return "—";
  return `${num.toFixed(1)}%`;
}

export function num(n: string | number | undefined): string {
  if (n === undefined || n === "") return "0";
  const val = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(val)) return "0";
  return Number.isInteger(val) ? String(val) : val.toFixed(1);
}

export function winRate(wins: string, games: string): string {
  const w = parseFloat(wins);
  const g = parseFloat(games);
  if (!g) return "0%";
  return `${((w / g) * 100).toFixed(1)}%`;
}

export const POSITION_LABELS: Record<string, string> = {
  goalkeeper: "GK",
  defender: "DEF",
  midfielder: "MID",
  forward: "FWD",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  "common-gen4": "PS4 / Xbox One",
  "common-gen5": "PS5 / Xbox Series",
};
