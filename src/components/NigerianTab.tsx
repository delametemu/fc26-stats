import { useMemo, useState } from "react";
import type { Match, MemberStats, NigerianData } from "../types";
import { displayName } from "../lib/stats";
import { formatTimestamp } from "../api";

interface Props {
  members: MemberStats[];
  matches: Match[];
  clubId: string;
  data: NigerianData | null;
  onAward: (playerName: string, matchId?: string, opponentName?: string, note?: string) => Promise<void>;
  onRemove: (awardId: string) => Promise<void>;
}

function matchLabel(match: Match, clubId: string): string {
  const clubs = match.clubs;
  if (!clubs || Array.isArray(clubs)) return `Match ${match.matchId}`;
  const us = clubs[clubId];
  const themEntry = Object.entries(clubs).find(([id]) => id !== clubId);
  const themName = themEntry?.[1]?.details?.name ?? "Unknown";
  const score = us ? `${us.goals}–${us.goalsAgainst}` : "";
  return `vs ${themName} ${score} · ${formatTimestamp(match.timestamp)}`;
}

function opponentName(match: Match, clubId: string): string | undefined {
  const clubs = match.clubs;
  if (!clubs || Array.isArray(clubs)) return undefined;
  const themEntry = Object.entries(clubs).find(([id]) => id !== clubId);
  return themEntry?.[1]?.details?.name;
}

export default function NigerianTab({ members, matches, clubId, data, onAward, onRemove }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [customPlayer, setCustomPlayer] = useState("");
  const [selectedMatch, setSelectedMatch] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => displayName(a).localeCompare(displayName(b))),
    [members],
  );

  const playerName = selectedPlayer === "__custom__" ? customPlayer.trim() : selectedPlayer;

  async function handleAward() {
    if (!playerName) return;
    setSubmitting(true);
    setError(null);
    try {
      const match = matches.find((m) => m.matchId === selectedMatch);
      await onAward(
        playerName,
        match?.matchId,
        match ? opponentName(match, clubId) : undefined,
        note || undefined,
      );
      setSelectedPlayer("");
      setCustomPlayer("");
      setSelectedMatch("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add award");
    } finally {
      setSubmitting(false);
    }
  }

  const awards = data?.awards ?? [];
  const leaderboard = data?.leaderboard ?? [];
  const recentAwards = [...awards].reverse();

  return (
    <>
      <section className="section">
        <div className="section-header">
          <h2>🇳🇬 Award Nigerian of the Match</h2>
          <span className="club-meta">Once a Nigerian, always a Nigerian — the tag stays forever</span>
        </div>
        <div className="card nigerian-form">
          <div className="nigerian-form-row">
            <label>
              <span className="card-label">Player</span>
              <select
                className="platform-select"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
              >
                <option value="">Select a player…</option>
                {sortedMembers.map((m) => (
                  <option key={m.name} value={m.name}>
                    {displayName(m)}
                  </option>
                ))}
                <option value="__custom__">Other (type a name)</option>
              </select>
            </label>
            {selectedPlayer === "__custom__" && (
              <label>
                <span className="card-label">Name</span>
                <input
                  className="nigerian-input"
                  value={customPlayer}
                  onChange={(e) => setCustomPlayer(e.target.value)}
                  placeholder="Player name"
                />
              </label>
            )}
            <label>
              <span className="card-label">Match (optional)</span>
              <select
                className="platform-select"
                value={selectedMatch}
                onChange={(e) => setSelectedMatch(e.target.value)}
              >
                <option value="">No specific match</option>
                {matches.map((m) => (
                  <option key={m.matchId} value={m.matchId}>
                    {matchLabel(m, clubId)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="card-label">Note (optional)</span>
              <input
                className="nigerian-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What did they do?"
                maxLength={140}
              />
            </label>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAward}
              disabled={!playerName || submitting}
            >
              {submitting ? "Awarding…" : "Award 🇳🇬"}
            </button>
          </div>
          {error && <div className="error" style={{ marginTop: "0.75rem" }}>{error}</div>}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>All-Time Nigerian Leaderboard</h2>
          <span className="club-meta">{awards.length} total awards given</span>
        </div>
        {leaderboard.length === 0 ? (
          <div className="empty">No Nigerian of the Match awarded yet. Someone has to be first.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th className="num">Awards</th>
                  <th>Last Awarded</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, i) => (
                  <tr key={row.playerName}>
                    <td className="num">{i + 1}</td>
                    <td>
                      <strong>
                        {row.playerName} <span className="nigerian-flag">🇳🇬</span>
                        {i === 0 && <span title="Most Nigerian"> 👑</span>}
                      </strong>
                    </td>
                    <td className="num">{row.count}</td>
                    <td className="club-meta">{new Date(row.lastAwardedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {recentAwards.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2>Award History</h2>
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {recentAwards.map((award) => (
              <div key={award.id} className="nigerian-award-row">
                <div>
                  <strong>
                    {award.playerName} <span className="nigerian-flag">🇳🇬</span>
                  </strong>
                  <div className="club-meta">
                    {new Date(award.awardedAt).toLocaleString()}
                    {award.opponentName && ` · vs ${award.opponentName}`}
                    {award.note && ` · "${award.note}"`}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => onRemove(award.id)}
                  title="Remove this award"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
