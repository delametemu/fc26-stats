export type Platform = "common-gen4" | "common-gen5";

export type MatchType = "friendlyMatch" | "leagueMatch" | "playoffMatch";

export interface ClubInfo {
  clubId: string | number;
  name: string;
  regionId: number;
  teamId: number;
  customKit?: {
    stadName?: string;
    kitColor1?: string;
    kitColor2?: string;
    kitColor3?: string;
  };
}

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
  cleanSheets?: string | number;
  points?: string | number;
  clubInfo: ClubInfo;
}

export interface MemberStats {
  name: string;
  proName?: string;
  proPos: string | number;
  proStyle?: string;
  proOverall: number | string;
  gamesPlayed: string;
  winRate: string;
  goals: string;
  assists: string;
  passesMade?: string;
  passesmade?: string;
  passSuccessRate?: string;
  passattempts?: string;
  tacklesMade?: string;
  tacklesmade?: string;
  tackleSuccessRate?: string;
  tackleattempts?: string;
  shotSuccessRate?: string;
  saves?: string;
  cleanSheetsDef?: string;
  cleanSheetsGK?: string;
  cleansheetsany?: string;
  cleansheetsdef?: string;
  cleansheetsgk?: string;
  ratingAve: string;
  manOfTheMatch?: string;
  mom?: string;
  redCards?: string;
  favoritePosition?: string;
}

export interface MatchClubRow {
  goals: string;
  goalsAgainst: string;
  result: string;
  score?: string;
  wins?: string;
  losses?: string;
  ties?: string;
  winnerByDnf?: string;
  details?: {
    name: string;
    clubId: number;
    regionId?: number;
    teamId?: number;
    customKit?: ClubInfo["customKit"];
  };
}

/** Per-player stats within a single match. All values arrive as strings from EA. */
export interface MatchPlayerStats {
  playername: string;
  pos: string;
  archetypeid?: string;
  rating: string;
  goals: string;
  assists: string;
  shots: string;
  passesmade: string;
  passattempts: string;
  tacklesmade: string;
  tackleattempts: string;
  saves: string;
  goalsconceded: string;
  cleansheetsany: string;
  cleansheetsdef: string;
  cleansheetsgk: string;
  redcards: string;
  mom: string;
  wins: string;
  losses: string;
  gameTime?: string;
  secondsPlayed?: string;
  realtimegame?: string;
  realtimeidle?: string;
  ballDiveSaves?: string;
  crossSaves?: string;
  goodDirectionSaves?: string;
  parrySaves?: string;
  punchSaves?: string;
  reflexSaves?: string;
  SCORE?: string;
  namespace?: string;
  userResult?: string;
  vproattr?: string;
  vprohackreason?: string;
  [key: string]: string | undefined;
}

/** Summed team stats for one club in a match. Values are numbers (unlike player stats). */
export type MatchAggregateStats = Record<string, number>;

export interface Match {
  matchId: string;
  timestamp: number;
  timeAgo?: { number: number; unit: string };
  clubs: Record<string, MatchClubRow> | MatchClubRow[];
  players?: Record<string, Record<string, MatchPlayerStats>>;
  aggregate?: Record<string, MatchAggregateStats>;
}

export interface ClubDetails {
  [clubId: string]: {
    name: string;
    clubId: number;
    regionId: number;
    teamId: number;
    customKit?: ClubInfo["customKit"];
  };
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
  points?: string;
  promotions?: string;
  relegations?: string;
  skillRating: string;
  bestDivision: string;
  currentDivision?: string;
  reputationtier?: string;
  leagueAppearances?: string;
  gamesPlayedPlayoff?: string;
  wstreak?: string;
  unbeatenstreak?: string;
  lastMatch0?: string;
  lastMatch1?: string;
  lastMatch2?: string;
  lastMatch3?: string;
  lastMatch4?: string;
  lastMatch5?: string;
  lastMatch6?: string;
  lastMatch7?: string;
  lastMatch8?: string;
  lastMatch9?: string;
  lastOpponent0?: string;
  lastOpponent1?: string;
  lastOpponent2?: string;
  lastOpponent3?: string;
  lastOpponent4?: string;
  lastOpponent5?: string;
  lastOpponent6?: string;
  lastOpponent7?: string;
  lastOpponent8?: string;
  lastOpponent9?: string;
}

export type OverallStats = OverallStatsEntry[] | Record<string, OverallStatsEntry>;

export interface ClubDashboard {
  clubId: string;
  info: ClubDetails[string] | null;
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
