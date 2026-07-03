import type {
  ClipsByMatch,
  ClubDashboard,
  ClubSearchResult,
  MatchClip,
  NigerianData,
  Platform,
  PotdData,
  SavedMatch,
} from "./types";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  
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

function postJson<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Stable anonymous id for this browser, used for one-vote-per-person voting. */
export function getVoterId(): string {
  const KEY = "fc26-voter-id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getNigerianData(clubId: string) {
  return apiFetch<NigerianData>(`/api/club/${clubId}/nigerian`);
}

export function awardNigerian(
  clubId: string,
  playerName: string,
  matchId?: string,
  opponentName?: string,
  note?: string,
) {
  return postJson<NigerianData & { award: unknown }>(`/api/club/${clubId}/nigerian`, {
    playerName,
    matchId,
    opponentName,
    note,
  });
}

export function removeNigerianAward(clubId: string, awardId: string) {
  return apiFetch<NigerianData>(`/api/club/${clubId}/nigerian/${awardId}`, { method: "DELETE" });
}

export function getPotd(clubId: string) {
  const params = new URLSearchParams({ voterId: getVoterId() });
  return apiFetch<PotdData>(`/api/club/${clubId}/potd?${params}`);
}

export function votePotd(clubId: string, playerName: string) {
  return postJson<PotdData>(`/api/club/${clubId}/potd/vote`, {
    playerName,
    voterId: getVoterId(),
  });
}

export function getClips(clubId: string) {
  return apiFetch<{ clips: ClipsByMatch }>(`/api/club/${clubId}/clips`);
}

export function addClip(clubId: string, matchId: string, url: string, title?: string) {
  return postJson<{ clip: MatchClip; clips: ClipsByMatch }>(`/api/club/${clubId}/clips`, {
    matchId,
    url,
    title,
  });
}

export function removeClip(clubId: string, clipId: string) {
  return apiFetch<{ clips: ClipsByMatch }>(`/api/club/${clubId}/clips/${clipId}`, { method: "DELETE" });
}

export function getSavedMatches(clubId: string) {
  return apiFetch<{ matches: SavedMatch[]; count: number }>(`/api/club/${clubId}/saved-matches`);
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
