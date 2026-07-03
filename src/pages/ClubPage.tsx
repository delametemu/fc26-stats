import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getClubDashboard } from "../api";
import { usePlatform } from "../components/Layout";
import FormBar from "../components/FormBar";
import MatchHistory from "../components/MatchHistory";
import PlayerCards from "../components/PlayerCards";
import PlayerTable from "../components/PlayerTable";
import StatCard from "../components/StatCard";
import {
  clubStatCards,
  computeStreak,
  recentFormSummary,
} from "../lib/stats";
import type { ClubDashboard, Match } from "../types";

type PageTab = "stats" | "players" | "matches";
type MatchTab = "league" | "playoff" | "friendly";

export default function ClubPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const { platform } = usePlatform();
  const [data, setData] = useState<ClubDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageTab, setPageTab] = useState<PageTab>("stats");
  const [matchTab, setMatchTab] = useState<MatchTab>("league");
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 60_000);
    return () => clearInterval(interval);
  }, [load]);

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
  const matchesByTab: Record<MatchTab, Match[]> = {
    league: data.recentMatches.league,
    playoff: data.recentMatches.playoff,
    friendly: data.recentMatches.friendly,
  };
  const allMatches = [...matchesByTab.league, ...matchesByTab.playoff, ...matchesByTab.friendly].sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  return (
    <>
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
        {(["stats", "players", "matches"] as PageTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab ${pageTab === tab ? "active" : ""}`}
            onClick={() => setPageTab(tab)}
          >
            {tab === "stats" ? "Club Stats" : tab === "players" ? "Players" : "Matches"}
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
            <PlayerTable members={data.memberStats} />
          </section>
        </>
      )}

      {pageTab === "matches" && (
        <section className="section">
          <div className="section-header">
            <h2>Match History</h2>
            <span className="club-meta">{allMatches.length} recent matches loaded</span>
          </div>
          <div className="tabs">
            {(["league", "playoff", "friendly"] as MatchTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`tab ${matchTab === tab ? "active" : ""}`}
                onClick={() => setMatchTab(tab)}
              >
                {tab === "league" ? "League" : tab === "playoff" ? "Playoffs" : "Friendlies"} (
                {matchesByTab[tab].length})
              </button>
            ))}
          </div>
          <MatchHistory matches={matchesByTab[matchTab]} clubId={data.clubId} />
        </section>
      )}
    </>
  );
}
