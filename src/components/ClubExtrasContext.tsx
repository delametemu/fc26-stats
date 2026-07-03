import { createContext, useContext } from "react";
import type { ClipsByMatch } from "../types";

export interface ClubExtras {
  /** Lower-cased player names that have ever won Nigerian of the Match. */
  nigerianNames: Set<string>;
  clips: ClipsByMatch;
  addClip: (matchId: string, url: string, title?: string) => Promise<void>;
  removeClip: (clipId: string) => Promise<void>;
}

const ClubExtrasContext = createContext<ClubExtras>({
  nigerianNames: new Set(),
  clips: {},
  addClip: async () => {},
  removeClip: async () => {},
});

export function useClubExtras() {
  return useContext(ClubExtrasContext);
}

export function isNigerian(extras: ClubExtras, ...names: (string | undefined)[]): boolean {
  return names.some((n) => n && extras.nigerianNames.has(n.toLowerCase()));
}

/** 🇳🇬 shown next to any player who has ever received Nigerian of the Match. */
export function NigerianFlag({ show, compact }: { show: boolean; compact?: boolean }) {
  if (!show) return null;
  return (
    <span
      className={`nigerian-flag${compact ? " compact" : ""}`}
      title="Nigerian of the Match winner"
      aria-label="Nigerian of the Match winner"
    >
      🇳🇬
    </span>
  );
}

export default ClubExtrasContext;
