import type { Match, MemberStats, OverallStatsEntry, Platform } from "./types.js";

export function pickClubStats(
  payload: OverallStatsEntry[] | Record<string, OverallStatsEntry>,
  clubId: string,
): OverallStatsEntry | null {
  if (Array.isArray(payload)) {
    return payload.find((row) => String(row.clubId) === clubId) ?? payload[0] ?? null;
  }
  return payload[clubId] ?? payload[String(clubId)] ?? null;
}

export function parseForm(lastMatches: (string | number | undefined)[]): ("W" | "L" | "D" | "-")[] {
  return lastMatches.map((code) => {
    const v = String(code ?? "-1");
    if (v === "1") return "W";
    if (v === "2") return "L";
    if (v === "0") return "D";
    return "-";
  });
}

export function computeStreak(form: ("W" | "L" | "D" | "-")[]): { type: "W" | "L" | "D" | "none"; count: number } {
  const active = form.filter((r) => r !== "-");
  if (!active.length) return { type: "none", count: 0 };
  const first = active[0];
  let count = 0;
  for (const r of active) {
    if (r !== first) break;
    count++;
  }
  return { type: first, count };
}

export interface NormalizedMatchSide {
  clubId: string;
  name: string;
  goals: number;
  goalsAgainst: number;
  result: "W" | "L" | "D";
}

export interface NormalizedMatch {
  matchId: string;
  timestamp: number;
  us: NormalizedMatchSide;
  opponent: NormalizedMatchSide;
}

export function normalizeMatch(match: Match, clubId: string): NormalizedMatch | null {
  const clubs = match.clubs;
  if (!clubs || Array.isArray(clubs)) return null;

  const entries = Object.entries(clubs).map(([id, row]) => ({
    clubId: id,
    name: row.details?.name ?? `Club ${id}`,
    goals: Number(row.goals ?? 0),
    goalsAgainst: Number(row.goalsAgainst ?? 0),
    result: (row.result === "1" ? "W" : row.result === "2" ? "L" : "D") as "W" | "L" | "D",
  }));

  const us = entries.find((e) => e.clubId === clubId);
  const opponent = entries.find((e) => e.clubId !== clubId);
  if (!us || !opponent) return null;

  return {
    matchId: match.matchId,
    timestamp: match.timestamp,
    us,
    opponent,
  };
}

export function perGame(total: string | number, games: string | number): string {
  const g = Number(games);
  if (!g) return "0.0";
  return (Number(total) / g).toFixed(1);
}

export function goalContributions(member: MemberStats): number {
  return Number(member.goals) + Number(member.assists);
}

export const POSITION_CODES: Record<string, string> = {
  "0": "GK",
  "1": "SW",
  "2": "RWB",
  "3": "RB",
  "4": "RCB",
  "5": "CB",
  "6": "LCB",
  "7": "LB",
  "8": "LWB",
  "9": "RDM",
  "10": "CDM",
  "11": "LDM",
  "12": "RM",
  "13": "RCM",
  "14": "CM",
  "15": "LCM",
  "16": "LM",
  "17": "RAM",
  "18": "CAM",
  "19": "LAM",
  "20": "RF",
  "21": "CF",
  "22": "LF",
  "23": "RW",
  "24": "RS",
  "25": "ST",
  "26": "LS",
  "27": "LW",
};

export function displayPosition(member: MemberStats): string {
  if (member.favoritePosition) {
    const pos = member.favoritePosition.toUpperCase();
    if (pos.length <= 3) return pos;
    return pos.slice(0, 3).toUpperCase();
  }
  return POSITION_CODES[String(member.proPos)] ?? String(member.proPos);
}

export type PlatformLabel = Platform;
