interface StatCardProps {
  label: string;
  value: string | number;
  accent?: boolean;
}

export default function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      <div className="card-value" style={accent ? { color: "var(--accent)" } : undefined}>
        {value}
      </div>
    </div>
  );
}
