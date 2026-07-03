import { useState } from "react";
import type { Match, MatchAggregate, MatchPlayerRow } from "../types";
import {
  buildSide,
  pctOf,
  playerStatRows,
  positionLabel,
  ratingClass,
  redCards,
  yellowCards,
  type MatchSide as Side,
} from "../lib/matchStats";
import MatchPitch from "./MatchPitch";
import MatchClips from "./MatchClips";
import { isNigerian, NigerianFlag, useClubExtras } from "./ClubExtrasContext";
import { CardIcon, FootIcon } from "./icons";

interface Props {
  match: Match;
  clubId: string;
}

type DetailTab = "lineup" | "list" | "stats";

function ScorerList({ side }: { side: Side }) {
  const scorers = side.players.filter((p) => Number(p.goals) > 0);
  const assisters = side.players.filter((p) => Number(p.assists) > 0);

  return (
    <div className="scorer-block">
      <div className="scorer-club">{side.name}</div>
      {scorers.length === 0 && assisters.length === 0 && <div className="club-meta">No goal involvements</div>}
      {scorers.map((p) => (
        <div key={`g-${p.playername}`} className="scorer-line">
          ⚽ {p.playername}
          {Number(p.goals) > 1 && ` ×${p.goals}`}
        </div>
      ))}
      {assisters.map((p) => (
        <div key={`a-${p.playername}`} className="scorer-line assist-line">
          <FootIcon /> {p.playername}
          {Number(p.assists) > 1 && ` ×${p.assists}`}
        </div>
      ))}
    </div>
  );
}

interface CompareRow {
  label: string;
  us: number;
  them: number;
  format?: (n: number) => string;
}

function TeamComparison({ us, them }: { us: Side; them: Side }) {
  const a = us.aggregate as MatchAggregate | undefined;
  const b = them.aggregate as MatchAggregate | undefined;
  if (!a || !b) {
    return <div className="empty">No team stats available for this match.</div>;
  }

  const rows: CompareRow[] = [
    { label: "Shots", us: a.shots, them: b.shots },
    { label: "Passes Completed", us: a.passesmade, them: b.passesmade },
    {
      label: "Pass Accuracy",
      us: pctOf(a.passesmade, a.passattempts) ?? 0,
      them: pctOf(b.passesmade, b.passattempts) ?? 0,
      format: (n) => `${n.toFixed(0)}%`,
    },
    { label: "Tackles Won", us: a.tacklesmade, them: b.tacklesmade },
    {
      label: "Tackle Success",
      us: pctOf(a.tacklesmade, a.tackleattempts) ?? 0,
      them: pctOf(b.tacklesmade, b.tackleattempts) ?? 0,
      format: (n) => `${n.toFixed(0)}%`,
    },
    { label: "Saves", us: a.saves, them: b.saves },
    { label: "Red Cards", us: a.redcards, them: b.redcards },
  ];

  return (
    <div className="team-compare">
      <div className="team-compare-header">
        <span>{us.name}</span>
        <span className="club-meta">Team Stats</span>
        <span>{them.name}</span>
      </div>
      {rows.map((row) => {
        const total = row.us + row.them;
        const usShare = total ? (row.us / total) * 100 : 50;
        const fmt = row.format ?? ((n: number) => String(Math.round(n)));
        return (
          <div key={row.label} className="compare-row">
            <div className="compare-values">
              <span className={row.us >= row.them ? "compare-lead" : ""}>{fmt(row.us)}</span>
              <span className="compare-label">{row.label}</span>
              <span className={row.them >= row.us ? "compare-lead" : ""}>{fmt(row.them)}</span>
            </div>
            <div className="compare-bar">
              <div className="compare-bar-us" style={{ width: `${usShare}%` }} />
              <div className="compare-bar-them" style={{ width: `${100 - usShare}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlayerStatDetail({ player }: { player: MatchPlayerRow }) {
  const rows = playerStatRows(player);
  return (
    <div className="player-stat-detail">
      <div className="player-stat-grid">
        {rows.map((s) => (
          <div key={s.label} className="player-stat-cell">
            <span className="player-stat-value">{s.value}</span>
            <span className="player-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerRatingRow({
  player,
  isExpanded,
  onToggle,
}: {
  player: MatchPlayerRow;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const extras = useClubExtras();
  const rating = parseFloat(player.rating);
  const goals = Number(player.goals);
  const assists = Number(player.assists);
  const reds = redCards(player);
  const yellows = yellowCards(player);
  const isMotm = player.mom === "1";

  return (
    <div className="rating-row-wrap">
      <button type="button" className={`rating-row ${isExpanded ? "expanded" : ""}`} onClick={onToggle}>
        <span className={`rating-badge ${ratingClass(rating)}`}>
          {Number.isNaN(rating) ? "—" : rating.toFixed(1)}
        </span>
        <span className="rating-player-info">
          <span className="rating-player-name">
            {player.playername}
            <NigerianFlag show={isNigerian(extras, player.playername)} />
            {isMotm && (
              <span className="motm-star" title="Man of the Match">
                {" "}
                ⭐
              </span>
            )}
          </span>
          <span className="pos-badge rating-pos-badge">{positionLabel(player.pos)}</span>
        </span>
        <span className="rating-player-contrib">
          {goals > 0 && <span className="contrib-icon">⚽{goals > 1 ? `×${goals}` : ""}</span>}
          {assists > 0 && (
            <span className="contrib-icon" title={`${assists} assist${assists > 1 ? "s" : ""}`}>
              <FootIcon />
              {assists > 1 ? `×${assists}` : ""}
            </span>
          )}
          {yellows > 0 && (
            <span className="contrib-icon" title={`${yellows} yellow card${yellows > 1 ? "s" : ""}`}>
              <CardIcon color="yellow" />
              {yellows > 1 ? `×${yellows}` : ""}
            </span>
          )}
          {reds > 0 && (
            <span className="contrib-icon" title="Red card">
              <CardIcon color="red" />
              {reds > 1 ? `×${reds}` : ""}
            </span>
          )}
        </span>
        <span className="expand-chevron">{isExpanded ? "▲" : "▼"}</span>
      </button>
      {isExpanded && <PlayerStatDetail player={player} />}
    </div>
  );
}

function RatingsSide({
  side,
  expandedKey,
  onToggle,
}: {
  side: Side;
  expandedKey: string | null;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="ratings-side">
      <h4 className="match-detail-title">{side.name}</h4>
      {side.players.length === 0 ? (
        <div className="empty" style={{ padding: "1rem" }}>
          No player data recorded for {side.name}.
        </div>
      ) : (
        <div className="ratings-list">
          {side.players.map((p) => {
            const key = `${side.clubId}-${p.playername}`;
            return (
              <PlayerRatingRow
                key={key}
                player={p}
                isExpanded={expandedKey === key}
                onToggle={() => onToggle(key)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MatchDetail({ match, clubId }: Props) {
  const [tab, setTab] = useState<DetailTab>("lineup");
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  const clubs = match.clubs;
  if (!clubs || Array.isArray(clubs)) return null;

  const sides = Object.entries(clubs).map(([id, row]) => ({
    id,
    name: row.details?.name ?? `Club ${id}`,
  }));

  const oursMeta = sides.find((s) => s.id === clubId);
  const theirsMeta = sides.find((s) => s.id !== clubId);
  if (!oursMeta || !theirsMeta) return null;

  const us = buildSide(match, oursMeta.id, oursMeta.name);
  const them = buildSide(match, theirsMeta.id, theirsMeta.name);

  function toggle(key: string) {
    setExpandedPlayer((prev) => (prev === key ? null : key));
  }

  return (
    <div className="match-detail">
      <div className="match-detail-summary">
        <ScorerList side={us} />
        <ScorerList side={them} />
      </div>

      <div className="tabs match-detail-tabs">
        <button type="button" className={`tab ${tab === "lineup" ? "active" : ""}`} onClick={() => setTab("lineup")}>
          ⚽ Lineup
        </button>
        <button type="button" className={`tab ${tab === "list" ? "active" : ""}`} onClick={() => setTab("list")}>
          📋 Ratings List
        </button>
        <button type="button" className={`tab ${tab === "stats" ? "active" : ""}`} onClick={() => setTab("stats")}>
          📊 Team Stats
        </button>
      </div>

      {tab === "lineup" && <MatchPitch match={match} clubId={clubId} />}

      {tab === "list" && (
        <div className="match-detail-tables">
          <RatingsSide side={us} expandedKey={expandedPlayer} onToggle={toggle} />
          <RatingsSide side={them} expandedKey={expandedPlayer} onToggle={toggle} />
        </div>
      )}

      {tab === "stats" && <TeamComparison us={us} them={them} />}

      <MatchClips matchId={match.matchId} />
    </div>
  );
}
