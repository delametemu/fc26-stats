import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import type { Match, MatchType } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

export interface NigerianAward {
  id: string;
  playerName: string;
  matchId?: string;
  opponentName?: string;
  note?: string;
  awardedAt: string;
}

export interface NigerianCount {
  playerName: string;
  count: number;
  lastAwardedAt: string;
}

export interface MatchClip {
  id: string;
  matchId: string;
  url: string;
  title?: string;
  addedAt: string;
}

export interface PotdDay {
  /** voterId -> playerName (one vote per voter per day, re-voting overwrites) */
  votes: Record<string, string>;
}

export interface SavedMatch {
  match: Match;
  matchType: MatchType;
  savedAt: string;
}

interface ClubStore {
  nigerianAwards: NigerianAward[];
  clips: Record<string, MatchClip[]>;
  potd: Record<string, PotdDay>;
  savedMatches: Record<string, SavedMatch>;
}

interface StoreShape {
  clubs: Record<string, ClubStore>;
}

let store: StoreShape = { clubs: {} };

function loadStore(): void {
  try {
    if (fs.existsSync(STORE_FILE)) {
      store = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8")) as StoreShape;
      if (!store.clubs) store = { clubs: {} };
    }
  } catch (err) {
    console.error("Failed to load data store, starting fresh:", err);
    store = { clubs: {} };
  }
}

let saveTimer: NodeJS.Timeout | null = null;

function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
    } catch (err) {
      console.error("Failed to persist data store:", err);
    }
  }, 250);
}

function clubStore(clubId: string): ClubStore {
  let club = store.clubs[clubId];
  if (!club) {
    club = { nigerianAwards: [], clips: {}, potd: {}, savedMatches: {} };
    store.clubs[clubId] = club;
  }
  // Backfill fields for stores written by older versions
  club.nigerianAwards ??= [];
  club.clips ??= {};
  club.potd ??= {};
  club.savedMatches ??= {};
  return club;
}

export function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ---------- Nigerian of the Match ----------

export function getNigerianAwards(clubId: string): NigerianAward[] {
  return clubStore(clubId).nigerianAwards;
}

export function getNigerianCounts(clubId: string): NigerianCount[] {
  const counts = new Map<string, NigerianCount>();
  for (const award of clubStore(clubId).nigerianAwards) {
    const key = award.playerName.toLowerCase();
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      if (award.awardedAt > existing.lastAwardedAt) existing.lastAwardedAt = award.awardedAt;
    } else {
      counts.set(key, { playerName: award.playerName, count: 1, lastAwardedAt: award.awardedAt });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.playerName.localeCompare(b.playerName));
}

export function addNigerianAward(
  clubId: string,
  playerName: string,
  matchId?: string,
  opponentName?: string,
  note?: string,
): NigerianAward {
  const award: NigerianAward = {
    id: crypto.randomUUID(),
    playerName: playerName.trim(),
    matchId,
    opponentName,
    note: note?.trim() || undefined,
    awardedAt: new Date().toISOString(),
  };
  clubStore(clubId).nigerianAwards.push(award);
  scheduleSave();
  return award;
}

export function removeNigerianAward(clubId: string, awardId: string): boolean {
  const club = clubStore(clubId);
  const before = club.nigerianAwards.length;
  club.nigerianAwards = club.nigerianAwards.filter((a) => a.id !== awardId);
  if (club.nigerianAwards.length !== before) {
    scheduleSave();
    return true;
  }
  return false;
}

// ---------- Plur of the Day voting ----------

export interface PotdTally {
  playerName: string;
  votes: number;
}

export function getPotd(clubId: string, dateKey: string, voterId?: string) {
  const day = clubStore(clubId).potd[dateKey] ?? { votes: {} };
  const tallies = new Map<string, PotdTally>();
  for (const playerName of Object.values(day.votes)) {
    const key = playerName.toLowerCase();
    const existing = tallies.get(key);
    if (existing) existing.votes += 1;
    else tallies.set(key, { playerName, votes: 1 });
  }
  const sorted = [...tallies.values()].sort((a, b) => b.votes - a.votes || a.playerName.localeCompare(b.playerName));
  return {
    date: dateKey,
    tallies: sorted,
    totalVotes: Object.keys(day.votes).length,
    yourVote: voterId ? day.votes[voterId] ?? null : null,
    winner: sorted[0]?.playerName ?? null,
  };
}

export function votePotd(clubId: string, playerName: string, voterId: string) {
  const club = clubStore(clubId);
  const dateKey = todayKey();
  const day = club.potd[dateKey] ?? { votes: {} };
  day.votes[voterId] = playerName.trim();
  club.potd[dateKey] = day;
  scheduleSave();
  return getPotd(clubId, dateKey, voterId);
}

export function getPotdHistory(clubId: string): { date: string; winner: string; votes: number }[] {
  const club = clubStore(clubId);
  return Object.keys(club.potd)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const { winner, totalVotes } = getPotd(clubId, date);
      return { date, winner: winner ?? "—", votes: totalVotes };
    })
    .filter((row) => row.votes > 0);
}

// ---------- Match clips ----------

export function getClips(clubId: string): Record<string, MatchClip[]> {
  return clubStore(clubId).clips;
}

export function addClip(clubId: string, matchId: string, url: string, title?: string): MatchClip {
  const clip: MatchClip = {
    id: crypto.randomUUID(),
    matchId,
    url: url.trim(),
    title: title?.trim() || undefined,
    addedAt: new Date().toISOString(),
  };
  const club = clubStore(clubId);
  const list = club.clips[matchId] ?? [];
  list.push(clip);
  club.clips[matchId] = list;
  scheduleSave();
  return clip;
}

export function removeClip(clubId: string, clipId: string): boolean {
  const club = clubStore(clubId);
  for (const [matchId, list] of Object.entries(club.clips)) {
    const next = list.filter((c) => c.id !== clipId);
    if (next.length !== list.length) {
      if (next.length) club.clips[matchId] = next;
      else delete club.clips[matchId];
      scheduleSave();
      return true;
    }
  }
  return false;
}

// ---------- Match archive (keep every game we ever see) ----------

export function archiveMatches(clubId: string, matches: Match[], matchType: MatchType): void {
  const club = clubStore(clubId);
  let added = false;
  for (const match of matches) {
    if (!match?.matchId) continue;
    if (!club.savedMatches[match.matchId]) {
      club.savedMatches[match.matchId] = {
        match,
        matchType,
        savedAt: new Date().toISOString(),
      };
      added = true;
    }
  }
  if (added) scheduleSave();
}

export function getSavedMatches(clubId: string): SavedMatch[] {
  return Object.values(clubStore(clubId).savedMatches).sort((a, b) => b.match.timestamp - a.match.timestamp);
}

export function getSavedMatchCount(clubId: string): number {
  return Object.keys(clubStore(clubId).savedMatches).length;
}

loadStore();
