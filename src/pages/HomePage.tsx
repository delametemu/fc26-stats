import { FormEvent, useCallback, useEffect, useState } from "react";
import { getLeaderboard, searchClubs } from "../api";
import { usePlatform } from "../components/Layout";
import LeaderboardTable from "../components/LeaderboardTable";
import SearchResults from "../components/SearchResults";
import type { ClubSearchResult } from "../types";

export default function HomePage() {
  const { platform } = usePlatform();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ClubSearchResult[]>([]);
  const [leaderboard, setLeaderboard] = useState<ClubSearchResult[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [lbError, setLbError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setLbLoading(true);
    setLbError(null);
    try {
      const data = await getLeaderboard(platform);
      setLeaderboard(data.results);
    } catch (err) {
      setLbError(err instanceof Error ? err.message : "Could not load leaderboard");
      setLeaderboard([]);
    } finally {
      setLbLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const data = await searchClubs(query, platform);
      setSearchResults(data.results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <>
      <section className="hero">
        <h1>Pro Clubs Statistics</h1>
        <p>
          Live EA Sports FC 26 Pro Clubs statistics for PS4 / Xbox One (last gen). Search any club,
          view skill rating, form, player ratings, and match history — updated every 60 seconds.
        </p>
        <form className="search-box" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="Search club name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Club name"
          />
          <button type="submit" className="btn btn-primary" disabled={searching || !query.trim()}>
            {searching ? "Searching…" : "Search"}
          </button>
        </form>
      </section>

      {searchError && <div className="error">{searchError}</div>}
      {searchResults.length > 0 && <SearchResults results={searchResults} />}

      {lbLoading ? (
        <div className="loading">Loading leaderboard…</div>
      ) : lbError ? (
        <div className="error">
          {lbError}
          <br />
          <small>EA&apos;s API may be temporarily down — try again shortly.</small>
        </div>
      ) : (
        <LeaderboardTable results={leaderboard} title="Top Clubs — All Time" />
      )}
    </>
  );
}
