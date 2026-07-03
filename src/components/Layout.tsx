import { Link } from "react-router-dom";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Platform } from "../types";
import { PLATFORM_LABELS } from "../api";

interface PlatformContextValue {
  platform: Platform;
  setPlatform: (p: Platform) => void;
}

const PlatformContext = createContext<PlatformContextValue>({
  platform: "common-gen4",
  setPlatform: () => {},
});

export function usePlatform() {
  return useContext(PlatformContext);
}

export default function Layout({ children }: { children: ReactNode }) {
  const [platform, setPlatform] = useState<Platform>("common-gen4");

  return (
    <PlatformContext.Provider value={{ platform, setPlatform }}>
      <div className="layout">
        <header className="header">
          <div className="header-inner">
            <Link to="/" className="logo">
              <span className="logo-mark">FC</span>
              <span>FC26 Stats</span>
            </Link>
            <select
              className="platform-select"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              aria-label="Platform"
            >
              {(Object.entries(PLATFORM_LABELS) as [Platform, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </header>
        <main className="main">{children}</main>
        <footer className="footer">
          Unofficial Pro Clubs stats · Data from EA Sports FC 26 · Cached for speed, refreshes every 45–120s
        </footer>
      </div>
    </PlatformContext.Provider>
  );
}
