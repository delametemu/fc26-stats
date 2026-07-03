import { useMemo, useState } from "react";
import type { MemberStats, PotdData } from "../types";
import { displayName } from "../lib/stats";

interface Props {
  members: MemberStats[];
  data: PotdData | null;
  onVote: (playerName: string) => Promise<void>;
}

export default function PotdSection({ members, data, onVote }: Props) {
  const [selected, setSelected] = useState("");
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => displayName(a).localeCompare(displayName(b))),
    [members],
  );

  async function handleVote() {
    if (!selected) return;
    setVoting(true);
    setError(null);
    try {
      await onVote(selected);
      setSelected("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setVoting(false);
    }
  }

  const today = data?.today;
  const history = data?.history ?? [];
  const maxVotes = today?.tallies[0]?.votes ?? 0;

  return (
    <section className="section">
      <div className="section-header">
        <h2>🏆 Plur of the Day</h2>
        <span className="club-meta">
          {today?.date} · {today?.totalVotes ?? 0} vote{(today?.totalVotes ?? 0) === 1 ? "" : "s"} today
        </span>
      </div>

      <div className="card">
        <div className="potd-vote-row">
          <select className="platform-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Vote for a player…</option>
            {sortedMembers.map((m) => (
              <option key={m.name} value={m.name}>
                {displayName(m)}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={handleVote} disabled={!selected || voting}>
            {voting ? "Voting…" : today?.yourVote ? "Change Vote" : "Vote"}
          </button>
          {today?.yourVote && (
            <span className="club-meta">
              Your vote: <strong>{today.yourVote}</strong>
            </span>
          )}
        </div>
        {error && <div className="error" style={{ marginTop: "0.75rem" }}>{error}</div>}

        {today && today.tallies.length > 0 && (
          <div className="potd-tallies">
            {today.tallies.map((t, i) => (
              <div key={t.playerName} className="potd-tally-row">
                <span className="potd-tally-name">
                  {i === 0 && "🏆 "}
                  {t.playerName}
                </span>
                <div className="potd-tally-bar-wrap">
                  <div
                    className="potd-tally-bar"
                    style={{ width: `${maxVotes ? (t.votes / maxVotes) * 100 : 0}%` }}
                  />
                </div>
                <span className="num potd-tally-votes">{t.votes}</span>
              </div>
            ))}
          </div>
        )}
        {today && today.tallies.length === 0 && (
          <div className="club-meta" style={{ marginTop: "0.75rem" }}>
            No votes yet today. Be the first to crown the plur.
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <div className="card-label">Past Winners</div>
          <div className="potd-history">
            {history.map((h) => (
              <div key={h.date} className="potd-history-row">
                <span className="club-meta">{h.date}</span>
                <strong>{h.winner}</strong>
                <span className="club-meta num">
                  {h.votes} vote{h.votes === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
