import type { MemberStats } from "../types";
import {
  displayName,
  displayPosition,
  goalContributions,
  momCount,
  num,
  passPct,
  perGame,
  shotPct,
  tacklePct,
} from "../lib/stats";

interface Props {
  members: MemberStats[];
}

export default function PlayerTable({ members }: Props) {
  const sorted = [...members].sort((a, b) => parseFloat(b.ratingAve) - parseFloat(a.ratingAve));

  if (!sorted.length) {
    return <div className="empty">No player stats available for this club.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Pos</th>
            <th>OVR</th>
            <th className="num">GP</th>
            <th className="num">G</th>
            <th className="num">A</th>
            <th className="num">G+A</th>
            <th className="num">G/G</th>
            <th className="num">Rating</th>
            <th className="num">Win%</th>
            <th className="num">Pass%</th>
            <th className="num">Tackle%</th>
            <th className="num">Shot%</th>
            <th className="num">MOTM</th>
            <th className="num">Red Cards</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const rating = parseFloat(p.ratingAve);
            return (
              <tr key={p.name}>
                <td>
                  <strong>{displayName(p)}</strong>
                  <div className="club-meta">{p.name}</div>
                </td>
                <td>
                  <span className="pos-badge">{displayPosition(p)}</span>
                </td>
                <td className="num">{p.proOverall}</td>
                <td className="num">{num(p.gamesPlayed)}</td>
                <td className="num">{num(p.goals)}</td>
                <td className="num">{num(p.assists)}</td>
                <td className="num">{goalContributions(p)}</td>
                <td className="num">{perGame(p.goals, p.gamesPlayed)}</td>
                <td className={`num ${rating >= 7.5 ? "rating-high" : ""}`}>{num(p.ratingAve)}</td>
                <td className="num">{p.winRate}%</td>
                <td className="num">{passPct(p)}</td>
                <td className="num">{tacklePct(p)}</td>
                <td className="num">{shotPct(p)}</td>
                <td className="num">{momCount(p)}</td>
                <td className={`num ${Number(p.redCards) > 0 ? "result-l" : ""}`}>{num(p.redCards)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
