import type { Match, MatchAggregate, MatchPlayerRow } from "../types";
import { POSITION_LABELS } from "../api";
import { POSITION_CODES } from "./stats";

export interface MatchSide {
  clubId: string;
  name: string;
  players: MatchPlayerRow[];
  aggregate?: MatchAggregate;
}

export type PositionGroup = "goalkeeper" | "defender" | "midfielder" | "forward";

const ATTACK_CODES = new Set(["ST", "LS", "RS", "CF", "LF", "RF", "LW", "RW"]);
const MID_CODES = new Set(["CAM", "LAM", "RAM", "CM", "LCM", "RCM", "LM", "RM", "CDM", "LDM", "RDM"]);

export function positionLabel(pos: string): string {
  return POSITION_LABELS[pos.toLowerCase()] ?? POSITION_CODES[pos] ?? pos.slice(0, 3).toUpperCase();
}

export function positionGroup(pos: string): PositionGroup {
  const p = pos.toLowerCase();
  if (p === "goalkeeper" || p === "gk" || p === "0") return "goalkeeper";
  if (p === "forward" || p === "fwd") return "forward";
  if (p === "midfielder" || p === "mid") return "midfielder";
  if (p === "defender" || p === "def") return "defender";

  const code = POSITION_CODES[pos];
  if (code === "GK") return "goalkeeper";
  if (code && ATTACK_CODES.has(code)) return "forward";
  if (code && MID_CODES.has(code)) return "midfielder";
  return "defender";
}

export function pctOf(made: number, attempts: number): number | null {
  if (!attempts) return null;
  return (made / attempts) * 100;
}

export function buildSide(match: Match, sideClubId: string, sideName: string): MatchSide {
  const roster = match.players?.[sideClubId] ?? {};
  return {
    clubId: sideClubId,
    name: sideName,
    players: Object.values(roster).sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating)),
    aggregate: match.aggregate?.[sideClubId],
  };
}

export function groupPlayers(players: MatchPlayerRow[]): Record<PositionGroup, MatchPlayerRow[]> {
  const groups: Record<PositionGroup, MatchPlayerRow[]> = {
    goalkeeper: [],
    defender: [],
    midfielder: [],
    forward: [],
  };
  for (const p of players) {
    groups[positionGroup(p.pos)].push(p);
  }
  return groups;
}

/** Approximate D-M-F shape from tracked human players (AI-filled teammates aren't included by EA). */
export function formationLabel(groups: Record<PositionGroup, MatchPlayerRow[]>): string {
  const parts = [groups.defender.length, groups.midfielder.length, groups.forward.length].filter((n) => n > 0);
  if (!parts.length) return "—";
  return parts.join("-");
}

export function ratingClass(rating: number): string {
  if (Number.isNaN(rating)) return "rating-na";
  if (rating >= 8.5) return "rating-elite";
  if (rating >= 7.5) return "rating-great";
  if (rating >= 6.5) return "rating-good";
  if (rating >= 6.0) return "rating-avg";
  return "rating-poor";
}

export function minutesPlayed(p: MatchPlayerRow): string | null {
  const seconds = p.secondsPlayed ?? p.gameTime;
  if (seconds === undefined) return null;
  const mins = Math.round(Number(seconds) / 60);
  if (Number.isNaN(mins)) return null;
  return `${mins}'`;
}

export interface StatRow {
  label: string;
  value: string;
}

/** Every EA-provided stat for a player in this match, sourced live from proclubs.ea.com. */
export function playerStatRows(player: MatchPlayerRow): StatRow[] {
  const passPct = pctOf(Number(player.passesmade), Number(player.passattempts));
  const tacklePct = pctOf(Number(player.tacklesmade), Number(player.tackleattempts));
  const isGk = positionGroup(player.pos) === "goalkeeper";
  const minutes = minutesPlayed(player);
  const resultLabel = player.wins === "1" ? "Win" : player.losses === "1" ? "Loss" : "Draw";
  const rating = parseFloat(player.rating);

  return [
    { label: "EA Match Rating", value: Number.isNaN(rating) ? "—" : rating.toFixed(1) },
    { label: "Minutes", value: minutes ?? "—" },
    { label: "Goals", value: player.goals },
    { label: "Assists", value: player.assists },
    { label: "Shots", value: player.shots },
    {
      label: "Passes",
      value: `${player.passesmade}/${player.passattempts}${passPct !== null ? ` (${passPct.toFixed(0)}%)` : ""}`,
    },
    {
      label: "Tackles",
      value: `${player.tacklesmade}/${player.tackleattempts}${tacklePct !== null ? ` (${tacklePct.toFixed(0)}%)` : ""}`,
    },
    ...(isGk || Number(player.saves) > 0 ? [{ label: "Saves", value: player.saves }] : []),
    { label: "Goals Conceded", value: player.goalsconceded },
    { label: "Clean Sheet", value: Number(player.cleansheetsany) > 0 ? "Yes" : "No" },
    { label: "Red Cards", value: Number(player.redcards) > 0 ? "🟥 Yes" : "None" },
    { label: "Result", value: resultLabel },
    { label: "Man of the Match", value: player.mom === "1" ? "⭐ Yes" : "No" },
  ];
}
