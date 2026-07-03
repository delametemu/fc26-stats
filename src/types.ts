export type Platform = "common-gen4" | "common-gen5";

export interface ClubSearchResult {
  rank?: number;
  clubName?: string;
  clubId?: string;
  skillRating?: string;
  wins?: string | number;
  losses?: string | number;
  ties?: string | number;
  goals?: string | number;
  goalsAgainst?: string | number;
  gamesPlayed?: string | number;
  winRate?: number;
  currentDivision?: string | number;
  clubInfo: {
    clubId: string | number;
    name: string;
    regionId: number;
    teamId: number;
  };
}

export interface MemberStats {
  name: string;
  proName?: string;
  proPos: string | number;
  proOverall: number | string;
  gamesPlayed: string;
  winRate: string;
  goals: string;
  assists: string;
  passesMade?: string;
  passSuccessRate?: string;
  tacklesMade?: string;
  tackleSuccessRate?: string;
  shotSuccessRate?: string;
  cleanSheetsDef?: string;
  cleanSheetsGK?: string;
  ratingAve: string;
  manOfTheMatch?: string;
  redCards?: string;
  favoritePosition?: string;
}

export interface MatchClubRow {
  goals: string;
  goalsAgainst: string;
  result: string;
  details?: { name: string; clubId: number };
}

export interface MatchPlayerRow {
  playername: string;
  /** Text position from EA match data: "goalkeeper" | "defender" | "midfielder" | "forward" (or numeric code) */
  pos: string;
  goals: string;
  assists: string;
  rating: string;
  shots: string;
  passesmade: string;
  passattempts: string;
  tacklesmade: string;
  tackleattempts: string;
  saves: string;
  goalsconceded: string;
  cleansheetsany: string;
  cleansheetsdef?: string;
  cleansheetsgk?: string;
  redcards: string;
  mom: string;
  secondsPlayed: string;
  gameTime?: string;
  wins?: string;
  losses?: string;
}

/** Summed team stats for one club in a match (numbers, unlike player stats). */
export interface MatchAggregate {
  goals: number;
  assists: number;
  shots: number;
  passesmade: number;
  passattempts: number;
  tacklesmade: number;
  tackleattempts: number;
  saves: number;
  goalsconceded: number;
  redcards: number;
  rating: number;
  [key: string]: number;
}

export interface Match {
  matchId: string;
  timestamp: number;
  timeAgo?: { number: number; unit: string };
  clubs: Record<string, MatchClubRow> | MatchClubRow[];
  players?: Record<string, Record<string, MatchPlayerRow>>;
  aggregate?: Record<string, MatchAggregate>;
}

export interface OverallStatsEntry {
  clubId: string;
  wins: string;
  losses: string;
  ties: string;
  gamesPlayed: string;
  goals: string;
  goalsAgainst: string;
  cleanSheets?: string;
  skillRating: string;
  bestDivision: string;
  currentDivision?: string;
  reputationtier?: string;
  leagueAppearances?: string;
  gamesPlayedPlayoff?: string;
  wstreak?: string;
  unbeatenstreak?: string;
  promotions?: string;
  relegations?: string;
}

export interface ClubDashboard {
  clubId: string;
  info: {
    name: string;
    clubId: number;
    customKit?: { stadName?: string };
  } | null;
  overallStats: OverallStatsEntry | null;
  memberStats: MemberStats[];
  careerStats: MemberStats[];
  recentMatches: {
    league: Match[];
    playoff: Match[];
    friendly: Match[];
  };
  form: ("W" | "L" | "D" | "-")[];
  fetchedAt: string;
  platform: Platform;
}
