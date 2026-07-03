/** Football boot icon used for assists. */
export function FootIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className="foot-icon"
    >
      <path d="M3.5 17.5c-.3-1 .2-2 1.2-2.4l6.6-2.6c.6-.2 1-.7 1.2-1.3l1.1-3.7c.3-1 1.2-1.6 2.2-1.5l3.1.4c1.2.2 2.1 1.2 2.1 2.4v6.2c0 .6-.5 1-1 1h-1.5l-.4 1.5c-.1.5-.6.9-1.1.9h-1.6c-.5 0-.9-.3-1.1-.8l-.3-.9H12l-.3.9c-.2.5-.6.8-1.1.8H9c-.5 0-1-.4-1.1-.9L7.5 16H5.4c-.9 0-1.7-.6-1.9-1.5v3z" />
      <path d="M2.5 19.5h19c.6 0 1 .4 1 1s-.4 1-1 1h-19c-.6 0-1-.4-1-1s.4-1 1-1z" />
    </svg>
  );
}

/** Card icon: pass color "red" or "yellow". */
export function CardIcon({ color, size = 12 }: { color: "red" | "yellow"; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={Math.round(size * 1.35)}
      aria-hidden="true"
      className="card-icon"
    >
      <rect
        x="4"
        y="2"
        width="16"
        height="20"
        rx="2.5"
        fill={color === "red" ? "#ff3b30" : "#ffd60a"}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="1"
      />
    </svg>
  );
}
