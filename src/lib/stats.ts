import type { MemberStats, OverallStatsEntry } from "../types";

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

export function perGame(total: string | number, games: string | number): string {
  const g = Number(games);
  if (!g) return "0.0";
  return (Number(total) / g).toFixed(1);
}

export function goalDiff(goals: string, against: string): string {
  const diff = Number(goals) - Number(against);
  return diff >= 0 ? `+${diff}` : String(diff);
}

export function momCount(m: MemberStats): string {
  return m.manOfTheMatch ?? "0";
}

export function passPct(m: MemberStats): string {
  return m.passSuccessRate ? `${m.passSuccessRate}%` : "—";
}

export function tacklePct(m: MemberStats): string {
  return m.tackleSuccessRate ? `${m.tackleSuccessRate}%` : "—";
}

export function shotPct(m: MemberStats): string {
  return m.shotSuccessRate ? `${m.shotSuccessRate}%` : "—";
}

export function goalContributions(m: MemberStats): number {
  return Number(m.goals) + Number(m.assists);
}

export function computeStreak(form: ("W" | "L" | "D" | "-")[]): string {
  const active = form.filter((r) => r !== "-");
  if (!active.length) return "No recent matches";
  const first = active[0];
  let count = 0;
  for (const r of active) {
    if (r !== first) break;
    count++;
  }
  const label = first === "W" ? "Win" : first === "L" ? "Loss" : "Draw";
  return count > 1 ? `${count} ${label}${count > 1 ? "es" : ""}` : `1 ${label}`;
}

export function recentFormSummary(form: ("W" | "L" | "D" | "-")[]): {
  wins: number;
  draws: number;
  losses: number;
  winRate: string;
} {
  const active = form.filter((r) => r !== "-") as ("W" | "L" | "D")[];
  const wins = active.filter((r) => r === "W").length;
  const draws = active.filter((r) => r === "D").length;
  const losses = active.filter((r) => r === "L").length;
  const total = active.length;
  return {
    wins,
    draws,
    losses,
    winRate: total ? `${((wins / total) * 100).toFixed(0)}%` : "—",
  };
}

export const POSITION_CODES: Record<string, string> = {
  "0": "GK", "5": "CB", "7": "LB", "10": "CDM", "14": "CM", "18": "CAM", "25": "ST",
};

export function displayPosition(m: MemberStats): string {
  if (m.favoritePosition) {
    const p = m.favoritePosition.toUpperCase();
    if (p === "GOALKEEPER") return "GK";
    if (p === "DEFENDER") return "DEF";
    if (p === "MIDFIELDER") return "MID";
    if (p === "FORWARD") return "FWD";
    return p.slice(0, 3);
  }
  return POSITION_CODES[String(m.proPos)] ?? String(m.proPos);
}

export function displayName(m: MemberStats): string {
  return m.proName || m.name;
}

export function clubStatCards(stats: OverallStatsEntry) {
  return {
    division: stats.currentDivision ?? stats.bestDivision,
    skillRating: stats.skillRating,
    reputation: stats.reputationtier ? `Tier ${stats.reputationtier}` : "—",
    leagueApps: stats.leagueAppearances ?? stats.gamesPlayed,
    record: `${stats.wins}W · ${stats.ties}D · ${stats.losses}L`,
    goalsPerGame: perGame(stats.goals, stats.gamesPlayed),
    concededPerGame: perGame(stats.goalsAgainst, stats.gamesPlayed),
    cleanSheets: stats.cleanSheets ?? "0",
    goalDifference: goalDiff(stats.goals, stats.goalsAgainst),
    winRate: winRate(stats.wins, stats.gamesPlayed),
    promotions: stats.promotions ?? "0",
    relegations: stats.relegations ?? "0",
  };
}
