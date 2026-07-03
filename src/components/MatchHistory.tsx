import { useState } from "react";
import type { Match } from "../types";
import { formatTimestamp } from "../api";
import MatchDetail from "./MatchDetail";
import { useClubExtras } from "./ClubExtrasContext";

interface Props {
  matches: Match[];
  clubId: string;
}

function normalizeMatch(match: Match, clubId: string) {
  const clubs = match.clubs;
  if (!clubs || Array.isArray(clubs)) return null;

  const sides = Object.entries(clubs).map(([id, row]) => ({
    clubId: id,
    name: row.details?.name ?? `Club ${id}`,
    goals: row.goals,
    result: row.result,
  }));

  const us = sides.find((s) => s.clubId === clubId);
  const them = sides.find((s) => s.clubId !== clubId);
  if (!us || !them) return null;

  return { us, them };
}

function resultClass(result: string): string {
  if (result === "1") return "result-w";
  if (result === "2") return "result-l";
  return "result-t";
}

function resultLabel(result: string): string {
  if (result === "1") return "W";
  if (result === "2") return "L";
  return "D";
}

function scorersSummary(match: Match, clubId: string): string {
  const roster = match.players?.[clubId];
  if (!roster) return "";
  const scorers = Object.values(roster)
    .filter((p) => Number(p.goals) > 0)
    .map((p) => `${p.playername}${Number(p.goals) > 1 ? ` ×${p.goals}` : ""}`);
  return scorers.join(", ");
}

export default function MatchHistory({ matches, clubId }: Props) {
  const { clips } = useClubExtras();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!matches.length) {
    return <div className="empty">No matches found for this filter.</div>;
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {matches.map((match) => {
        const parsed = normalizeMatch(match, clubId);
        if (!parsed) return null;

        const isExpanded = expandedId === match.matchId;
        const scorers = scorersSummary(match, clubId);
        const clipCount = clips[match.matchId]?.length ?? 0;

        return (
          <div key={match.matchId}>
            <button
              type="button"
              className={`match-row match-row-btn ${isExpanded ? "expanded" : ""}`}
              onClick={() => setExpandedId(isExpanded ? null : match.matchId)}
              aria-expanded={isExpanded}
            >
              <div className="match-team">{parsed.them.name}</div>
              <div className="match-score">
                <span className={resultClass(parsed.us.result)}>{resultLabel(parsed.us.result)}</span>{" "}
                {parsed.us.goals} – {parsed.them.goals}
              </div>
              <div className="match-team right">{parsed.us.name}</div>
              <div className="match-date">
                {formatTimestamp(match.timestamp)}
                {scorers && <span className="scorers"> · ⚽ {scorers}</span>}
                {clipCount > 0 && (
                  <span title={`${clipCount} clip${clipCount > 1 ? "s" : ""} attached`}> · 🎬 {clipCount}</span>
                )}
                <span className="expand-hint">{isExpanded ? " ▲ Hide details" : " ▼ Show details"}</span>
              </div>
            </button>
            {isExpanded && <MatchDetail match={match} clubId={clubId} />}
          </div>
        );
      })}
    </div>
  );
}
