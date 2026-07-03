import { useState } from "react";
import { useClubExtras } from "./ClubExtrasContext";

interface Props {
  matchId: string;
}

export default function MatchClips({ matchId }: Props) {
  const { clips, addClip, removeClip } = useClubExtras();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchClips = clips[matchId] ?? [];

  async function handleAdd() {
    if (!url.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addClip(matchId, url.trim(), title.trim() || undefined);
      setUrl("");
      setTitle("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add clip");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="match-clips">
      <div className="match-clips-header">
        <span className="card-label">🎬 Clips ({matchClips.length})</span>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Attach Clip"}
        </button>
      </div>

      {showForm && (
        <div className="match-clips-form">
          <input
            className="nigerian-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Clip URL (YouTube, Twitch, Xbox/PSN share, …)"
          />
          <input
            className="nigerian-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            maxLength={100}
          />
          <button
            type="button"
            className="btn btn-primary btn-small"
            onClick={handleAdd}
            disabled={!url.trim() || saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
      {error && <div className="error" style={{ marginTop: "0.5rem" }}>{error}</div>}

      {matchClips.length > 0 && (
        <div className="match-clips-list">
          {matchClips.map((clip) => (
            <div key={clip.id} className="match-clip-row">
              <a href={clip.url} target="_blank" rel="noopener noreferrer" className="club-link">
                ▶ {clip.title || clip.url}
              </a>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => removeClip(clip.id)}
                title="Remove clip"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
