import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addClip as apiAddClip,
  awardNigerian,
  getClips,
  getClubDashboard,
  getNigerianData,
  getPotd,
  getSavedMatches,
  removeClip as apiRemoveClip,
  removeNigerianAward,
  votePotd,
} from "../api";
import { usePlatform } from "../components/Layout";
import ClubExtrasContext, { type ClubExtras } from "../components/ClubExtrasContext";
import FormBar from "../components/FormBar";
import MatchHistory from "../components/MatchHistory";
import NigerianTab from "../components/NigerianTab";
import PlayerCards from "../components/PlayerCards";
import PlayerTable from "../components/PlayerTable";
import PotdSection from "../components/PotdSection";
import StatCard from "../components/StatCard";
import {
  clubStatCards,
  computeStreak,
  recentFormSummary,
} from "../lib/stats";
import type {
  ClipsByMatch,
  ClubDashboard,
  Match,
  NigerianData,
  PotdData,
  SavedMatch,
} from "../types";

type PageTab = "stats" | "players" | "matches" | "nigerian";
type MatchTab = "league" | "playoff" | "friendly" | "saved";

export default function ClubPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const { platform } = usePlatform();
  const [data, setData] = useState<ClubDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageTab, setPageTab] = useState<PageTab>("stats");
  const [matchTab, setMatchTab] = useState<MatchTab>("league");
  const [refreshing, setRefreshing] = useState(false);
  const [nigerianData, setNigerianData] = useState<NigerianData | null>(null);
  const [potdData, setPotdData] = useState<PotdData | null>(null);
  const [clips, setClips] = useState<ClipsByMatch>({});
  const [savedMatches, setSavedMatches] = useState<SavedMatch[]>([]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!clubId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const dashboard = await getClubDashboard(clubId, platform);
        setData(dashboard);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load club");
        setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [clubId, platform],
  );

  const loadExtras = useCallback(async () => {
    if (!clubId) return;
    const [nigerian, potd, clipData, saved] = await Promise.allSettled([
      getNigerianData(clubId),
      getPotd(clubId),
      getClips(clubId),
      getSavedMatches(clubId),
    ]);
    if (nigerian.status === "fulfilled") setNigerianData(nigerian.value);
    if (potd.status === "fulfilled") setPotdData(potd.value);
    if (clipData.status === "fulfilled") setClips(clipData.value.clips);
    if (saved.status === "fulfilled") setSavedMatches(saved.value.matches);
  }, [clubId]);

  useEffect(() => {
    load();
    loadExtras();
    const interval = setInterval(() => {
      load(true);
      loadExtras();
    }, 60_000);
    return () => clearInterval(interval);
  }, [load, loadExtras]);

  const handleAward = useCallback(
    async (playerName: string, matchId?: string, opponentName?: string, note?: string) => {
      if (!clubId) return;
      const result = await awardNigerian(clubId, playerName, matchId, opponentName, note);
      setNigerianData({ awards: result.awards, leaderboard: result.leaderboard });
    },
    [clubId],
  );

  const handleRemoveAward = useCallback(
    async (awardId: string) => {
      if (!clubId) return;
      const result = await removeNigerianAward(clubId, awardId);
      setNigerianData(result);
    },
    [clubId],
  );

  const handleVote = useCallback(
    async (playerName: string) => {
      if (!clubId) return;
      const result = await votePotd(clubId, playerName);
      setPotdData(result);
    },
    [clubId],
  );

  const extras: ClubExtras = useMemo(() => {
    const names = new Set<string>();
    for (const award of nigerianData?.awards ?? []) {
      names.add(award.playerName.toLowerCase());
    }
    return {
      nigerianNames: names,
      clips,
      addClip: async (matchId: string, url: string, title?: string) => {
        if (!clubId) return;
        const result = await apiAddClip(clubId, matchId, url, title);
        setClips(result.clips);
      },
      removeClip: async (clipId: string) => {
        if (!clubId) return;
        const result = await apiRemoveClip(clubId, clipId);
        setClips(result.clips);
      },
    };
  }, [nigerianData, clips, clubId]);

  if (loading) return <div className="loading">Loading club data…</div>;
  if (error) {
    return (
      <div className="error">
        {error}
        <br />
        <Link to="/" className="club-link">
          ← Back to search
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const stats = data.overallStats;
  const cards = stats ? clubStatCards(stats) : null;
  const formSummary = recentFormSummary(data.form);
  const matchesByTab: Record<Exclude<MatchTab, "saved">, Match[]> = {
    league: data.recentMatches.league,
    playoff: data.recentMatches.playoff,
    friendly: data.recentMatches.friendly,
  };
  const allMatches = [...matchesByTab.league, ...matchesByTab.playoff, ...matchesByTab.friendly].sort(
    (a, b) => b.timestamp - a.timestamp,
  );
  const savedMatchList = savedMatches.map((s) => s.match);
  const nigerianCount = nigerianData?.awards.length ?? 0;

  const TAB_LABELS: Record<PageTab, string> = {
    stats: "Club Stats",
    players: "Players",
    matches: "Matches",
    nigerian: `🇳🇬 Nigerian${nigerianCount ? ` (${nigerianCount})` : ""}`,
  };

  return (
    <ClubExtrasContext.Provider value={extras}>
      <div className="club-header">
        <div>
          <Link to="/" className="club-meta club-link">
            ← Back
          </Link>
          <h1>{data.info?.name ?? `Club ${data.clubId}`}</h1>
          <div className="club-meta">
            ID {data.clubId}
            {cards && ` · Division ${cards.division}`}
            {data.info?.customKit?.stadName && ` · ${data.info.customKit.stadName}`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className="badge badge-live">● Live</span>
          <button type="button" className="btn btn-ghost" onClick={() => load(true)} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="tabs page-tabs">
        {(["stats", "players", "matches", "nigerian"] as PageTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab ${pageTab === tab ? "active" : ""}`}
            onClick={() => setPageTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {pageTab === "stats" && cards && (
        <>
          <div className="grid grid-4">
            <StatCard label="Skill Rating" value={cards.skillRating} accent />
            <StatCard label="Division" value={cards.division} />
            <StatCard label="Reputation" value={cards.reputation} />
            <StatCard label="League Apps" value={cards.leagueApps} />
            <StatCard label="Record" value={cards.record} />
            <StatCard label="Win Rate" value={cards.winRate} />
            <StatCard label="Goals / Game" value={cards.goalsPerGame} />
            <StatCard label="Conceded / Game" value={cards.concededPerGame} />
            <StatCard label="Goal Difference" value={cards.goalDifference} />
            <StatCard label="Clean Sheets" value={cards.cleanSheets} />
            <StatCard label="Promotions" value={cards.promotions} />
            <StatCard label="Relegations" value={cards.relegations} />
          </div>

          <section className="section">
            <div className="section-header">
              <h2>Recent Form</h2>
              <span className="club-meta">{computeStreak(data.form)}</span>
            </div>
            <FormBar form={data.form} />
            <div className="grid grid-4" style={{ marginTop: "1rem" }}>
              <StatCard label="Last 10 Win Rate" value={formSummary.winRate} />
              <StatCard label="Form Wins" value={formSummary.wins} />
              <StatCard label="Form Draws" value={formSummary.draws} />
              <StatCard label="Form Losses" value={formSummary.losses} />
            </div>
          </section>
        </>
      )}

      {pageTab === "players" && (
        <>
          <section className="section">
            <div className="section-header">
              <h2>Squad Overview</h2>
              <span className="club-meta">Updated {new Date(data.fetchedAt).toLocaleTimeString()}</span>
            </div>
            <PlayerCards members={data.memberStats} />
          </section>
          <section className="section">
            <div className="section-header">
              <h2>Detailed Statistics</h2>
            </div>
            <PlayerTable members={data.memberStats} nigerianLeaderboard={nigerianData?.leaderboard} />
          </section>
        </>
      )}

      {pageTab === "matches" && (
        <section className="section">
          <div className="section-header">
            <h2>Match History</h2>
            <span className="club-meta">
              {allMatches.length} recent · {savedMatchList.length} saved all-time
            </span>
          </div>
          <div className="tabs">
            {(["league", "playoff", "friendly", "saved"] as MatchTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`tab ${matchTab === tab ? "active" : ""}`}
                onClick={() => setMatchTab(tab)}
              >
                {tab === "league"
                  ? `League (${matchesByTab.league.length})`
                  : tab === "playoff"
                    ? `Playoffs (${matchesByTab.playoff.length})`
                    : tab === "friendly"
                      ? `Friendlies (${matchesByTab.friendly.length})`
                      : `💾 All Saved (${savedMatchList.length})`}
              </button>
            ))}
          </div>
          {matchTab === "saved" ? (
            <>
              <p className="club-meta" style={{ marginBottom: "0.75rem" }}>
                Every match this site has ever seen is archived here — EA only keeps the last 10 per type,
                but these stick around forever.
              </p>
              <MatchHistory matches={savedMatchList} clubId={data.clubId} />
            </>
          ) : (
            <MatchHistory matches={matchesByTab[matchTab]} clubId={data.clubId} />
          )}
        </section>
      )}

      {pageTab === "nigerian" && (
        <>
          <NigerianTab
            members={data.memberStats}
            matches={allMatches}
            clubId={data.clubId}
            data={nigerianData}
            onAward={handleAward}
            onRemove={handleRemoveAward}
          />
          <PotdSection members={data.memberStats} data={potdData} onVote={handleVote} />
        </>
      )}
    </ClubExtrasContext.Provider>
  );
}
