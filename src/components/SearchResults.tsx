import { Link } from "react-router-dom";
import type { ClubSearchResult } from "../types";
import { num } from "../api";

interface Props {
  results: ClubSearchResult[];
}

export default function SearchResults({ results }: Props) {
  if (!results.length) {
    return <div className="empty">No clubs found. Try a different name.</div>;
  }

  return (
    <div className="search-results">
      {results.map((row) => (
        <Link key={row.clubInfo?.clubId ?? row.clubId} to={`/club/${row.clubInfo?.clubId ?? row.clubId}`} className="search-result-item">
          <div>
            <strong>{row.clubInfo?.name ?? row.clubName}</strong>
            <div className="club-meta">
              Rank #{row.rank} · ID {row.clubInfo?.clubId ?? row.clubId}
              {row.currentDivision != null && ` · Div ${row.currentDivision}`}
            </div>
          </div>
          <div className="club-meta" style={{ textAlign: "right" }}>
            {row.wins != null && (
              <>
                {row.wins}W · {row.losses}L · {row.ties ?? 0}D
                <br />
                {num(row.goals)} GF · {num(row.goalsAgainst)} GA
              </>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
