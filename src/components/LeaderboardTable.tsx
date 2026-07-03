import { Link } from "react-router-dom";
import type { ClubSearchResult } from "../types";
import { num } from "../api";

interface Props {
  results: ClubSearchResult[];
  title: string;
}

export default function LeaderboardTable({ results, title }: Props) {
  if (!results.length) {
    return <div className="empty">Leaderboard unavailable right now.</div>;
  }

  return (
    <section className="section">
      <div className="section-header">
        <h2>{title}</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Club</th>
              <th className="num">W</th>
              <th className="num">L</th>
              <th className="num">D</th>
              <th className="num">GF</th>
              <th className="num">GA</th>
              <th className="num">Win%</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr key={row.clubInfo.clubId}>
                <td className="num">{row.rank}</td>
                <td>
                  <Link to={`/club/${row.clubInfo?.clubId ?? row.clubId}`} className="club-link">
                    {row.clubInfo?.name ?? row.clubName ?? "Unknown"}
                  </Link>
                </td>
                <td className="num">{row.wins ?? "—"}</td>
                <td className="num">{row.losses ?? "—"}</td>
                <td className="num">{row.ties ?? "—"}</td>
                <td className="num">{num(row.goals)}</td>
                <td className="num">{num(row.goalsAgainst)}</td>
                <td className="num">
                  {row.winRate != null ? `${(row.winRate * 100).toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
