import { useState } from "react";
import type { Match, MatchPlayerRow } from "../types";
import {
  buildSide,
  formationLabel,
  groupPlayers,
  playerStatRows,
  positionLabel,
  ratingClass,
  redCards,
  yellowCards,
  type MatchSide,
  type PositionGroup,
} from "../lib/matchStats";
import { isNigerian, NigerianFlag, useClubExtras } from "./ClubExtrasContext";
import { CardIcon, FootIcon } from "./icons";

interface Props {
  match: Match;
  clubId: string;
}

interface PitchNode {
  player: MatchPlayerRow;
  x: number;
  y: number;
}

const GROUP_ORDER: PositionGroup[] = ["goalkeeper", "defender", "midfielder", "forward"];
const GROUP_X_FRACTION: Record<PositionGroup, number> = {
  goalkeeper: 0.08,
  defender: 0.32,
  midfielder: 0.58,
  forward: 0.85,
};

function computeNodes(groups: Record<PositionGroup, MatchPlayerRow[]>, side: "left" | "right"): PitchNode[] {
  const nodes: PitchNode[] = [];
  for (const group of GROUP_ORDER) {
    const players = groups[group];
    if (!players.length) continue;
    const frac = GROUP_X_FRACTION[group];
    const x = side === "left" ? 3 + frac * 44 : 97 - frac * 44;
    players.forEach((player, i) => {
      const y = players.length === 1 ? 50 : 12 + i * (76 / (players.length - 1));
      nodes.push({ player, x, y });
    });
  }
  return nodes;
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="60%" height="60%" fill="currentColor" aria-hidden="true">
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.24-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.76-3.6-5-8-5Z" />
    </svg>
  );
}

function PitchPlayerNode({ node, onSelect }: { node: PitchNode; onSelect: (p: MatchPlayerRow) => void }) {
  const extras = useClubExtras();
  const rating = parseFloat(node.player.rating);
  const isMotm = node.player.mom === "1";
  const goals = Number(node.player.goals);
  const assists = Number(node.player.assists);
  const reds = redCards(node.player);
  const yellows = yellowCards(node.player);

  return (
    <button
      type="button"
      className="pitch-player"
      style={{ left: `${node.x}%`, top: `${node.y}%` }}
      onClick={() => onSelect(node.player)}
    >
      <span className="pitch-avatar">
        <PersonIcon />
        <span className={`pitch-rating-badge ${ratingClass(rating)}`}>
          {Number.isNaN(rating) ? "—" : rating.toFixed(1)}
        </span>
        {isMotm && <span className="pitch-motm-badge" title="Man of the Match">⭐</span>}
        {goals > 0 && (
          <span className="pitch-goal-badge" title={`${goals} goal${goals > 1 ? "s" : ""}`}>
            ⚽{goals > 1 ? goals : ""}
          </span>
        )}
        {assists > 0 && (
          <span className="pitch-assist-badge" title={`${assists} assist${assists > 1 ? "s" : ""}`}>
            <FootIcon size={11} />
            {assists > 1 ? assists : ""}
          </span>
        )}
        {(reds > 0 || yellows > 0) && (
          <span className="pitch-card-badge" title={reds > 0 ? "Red card" : "Yellow card"}>
            <CardIcon color={reds > 0 ? "red" : "yellow"} size={9} />
          </span>
        )}
      </span>
      <span className="pitch-player-name">
        {node.player.playername}
        <NigerianFlag show={isNigerian(extras, node.player.playername)} compact />
      </span>
    </button>
  );
}

function PlayerStatModal({ player, onClose }: { player: MatchPlayerRow; onClose: () => void }) {
  const extras = useClubExtras();
  const rows = playerStatRows(player);
  return (
    <div className="stat-modal-backdrop" onClick={onClose}>
      <div className="stat-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="stat-modal-header">
          <div>
            <h3>
              {player.playername}
              <NigerianFlag show={isNigerian(extras, player.playername)} />
            </h3>
            <span className="pos-badge">{positionLabel(player.pos)}</span>
          </div>
          <button type="button" className="stat-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="player-stat-grid">
          {rows.map((row) => (
            <div key={row.label} className="player-stat-cell">
              <span className="player-stat-value">{row.value}</span>
              <span className="player-stat-label">{row.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamHeader({ side, formation, align }: { side: MatchSide; formation: string; align: "left" | "right" }) {
  return (
    <div className={`pitch-team pitch-team-${align}`}>
      {align === "left" && <span className="pitch-team-avatar">{side.name.charAt(0).toUpperCase()}</span>}
      <span className="pitch-formation">{formation}</span>
      <span className="pitch-team-name">{side.name}</span>
      {align === "right" && <span className="pitch-team-avatar">{side.name.charAt(0).toUpperCase()}</span>}
    </div>
  );
}

export default function MatchPitch({ match, clubId }: Props) {
  const [selected, setSelected] = useState<MatchPlayerRow | null>(null);

  const clubs = match.clubs;
  if (!clubs || Array.isArray(clubs)) return null;

  const sides = Object.entries(clubs).map(([id, row]) => ({ id, name: row.details?.name ?? `Club ${id}` }));
  const oursMeta = sides.find((s) => s.id === clubId);
  const theirsMeta = sides.find((s) => s.id !== clubId);
  if (!oursMeta || !theirsMeta) return null;

  const us = buildSide(match, oursMeta.id, oursMeta.name);
  const them = buildSide(match, theirsMeta.id, theirsMeta.name);

  const usGroups = groupPlayers(us.players);
  const themGroups = groupPlayers(them.players);
  const leftNodes = computeNodes(usGroups, "left");
  const rightNodes = computeNodes(themGroups, "right");
  const hasPlayers = leftNodes.length > 0 || rightNodes.length > 0;

  return (
    <div className="pitch-card">
      <div className="pitch-header">
        <TeamHeader side={us} formation={formationLabel(usGroups)} align="left" />
        <TeamHeader side={them} formation={formationLabel(themGroups)} align="right" />
      </div>

      {hasPlayers ? (
        <div className="pitch-scroll">
          <div className="pitch-wrap">
            <div className="pitch-lines" aria-hidden="true">
              <span className="pitch-halfline" />
              <span className="pitch-circle" />
              <span className="pitch-box pitch-box-left" />
              <span className="pitch-box pitch-box-right" />
            </div>
            {leftNodes.map((n) => (
              <PitchPlayerNode key={`us-${n.player.playername}`} node={n} onSelect={setSelected} />
            ))}
            {rightNodes.map((n) => (
              <PitchPlayerNode key={`them-${n.player.playername}`} node={n} onSelect={setSelected} />
            ))}
          </div>
        </div>
      ) : (
        <div className="empty" style={{ padding: "2rem" }}>
          No lineup data recorded for this match.
        </div>
      )}

      <p className="pitch-caption">Ratings pulled live from EA's match data · Tap a player for full stats</p>

      {selected && <PlayerStatModal player={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
