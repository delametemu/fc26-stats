import type { MemberStats } from "../types";
import {
  displayName,
  displayPosition,
  goalContributions,
  momCount,
  num,
  passPct,
  perGame,
} from "../lib/stats";
import { isNigerian, NigerianFlag, useClubExtras } from "./ClubExtrasContext";

interface Props {
  members: MemberStats[];
}

export default function PlayerCards({ members }: Props) {
  const extras = useClubExtras();
  const sorted = [...members].sort((a, b) => parseFloat(b.ratingAve) - parseFloat(a.ratingAve));

  if (!sorted.length) {
    return <div className="empty">No player stats available.</div>;
  }

  return (
    <div className="player-grid">
      {sorted.map((p) => {
        const rating = parseFloat(p.ratingAve);
        return (
          <article key={p.name} className="player-card">
            <div className="player-card-top">
              <div>
                <h3>
                  {displayName(p)}
                  <NigerianFlag show={isNigerian(extras, p.name, p.proName)} />
                </h3>
                <p className="club-meta">
                  {displayPosition(p)} · {p.name}
                </p>
              </div>
              <span className="ovr-badge">OVR {p.proOverall}</span>
            </div>
            <div className="player-card-stats">
              <div>
                <span className={`card-value ${rating >= 7.5 ? "rating-high" : ""}`}>{num(p.ratingAve)}</span>
                <span className="card-label">Avg Rating</span>
              </div>
              <div>
                <span className="card-value">{num(p.gamesPlayed)}</span>
                <span className="card-label">Games</span>
              </div>
              <div>
                <span className="card-value">{num(p.goals)}</span>
                <span className="card-label">Goals</span>
              </div>
              <div>
                <span className="card-value">{num(p.assists)}</span>
                <span className="card-label">Assists</span>
              </div>
              <div>
                <span className="card-value">{goalContributions(p)}</span>
                <span className="card-label">G+A</span>
              </div>
              <div>
                <span className="card-value">{perGame(p.goals, p.gamesPlayed)}</span>
                <span className="card-label">G/Game</span>
              </div>
              <div>
                <span className="card-value">{momCount(p)}</span>
                <span className="card-label">MOTM</span>
              </div>
              <div>
                <span className="card-value">{p.winRate}%</span>
                <span className="card-label">Win Rate</span>
              </div>
              <div>
                <span className="card-value">{passPct(p)}</span>
                <span className="card-label">Pass %</span>
              </div>
              <div>
                <span className={`card-value ${Number(p.redCards) > 0 ? "result-l" : ""}`}>{num(p.redCards)}</span>
                <span className="card-label">Red Cards</span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
