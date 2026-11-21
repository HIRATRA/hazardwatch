import type { CSSProperties } from "react";

interface SignalRingsProps {
  /** Diameter of the widest ring, in rem. */
  size?: number;
  /** Colour of the rings and the point, the accent colour by default. */
  color?: string;
  /** Whether the rings spread out. Still rings are drawn when false. */
  live?: boolean;
  className?: string;
}

/**
 * Rings spreading from a point, like an alert going out, as on the home
 * page. Centred on the box it is placed in, which has no size of its own.
 */
export function SignalRings({
  size = 10,
  color = "var(--color-accent)",
  live = true,
  className = "",
}: SignalRingsProps) {
  const ring: CSSProperties = {
    width: `${size}rem`,
    height: `${size}rem`,
    top: `${-size / 2}rem`,
    left: `${-size / 2}rem`,
    borderColor: `color-mix(in oklch, ${color} 55%, transparent)`,
  };

  return (
    <div aria-hidden className={`pointer-events-none absolute size-0 ${className}`}>
      {live ? (
        [0, 1200, 2400].map((delay) => (
          <span
            key={delay}
            className="signal-ring absolute rounded-full border"
            style={{ ...ring, "--delay": delay } as CSSProperties}
          />
        ))
      ) : (
        <>
          <span className="absolute rounded-full border opacity-50" style={ring} />
          <span
            className="absolute scale-[0.6] rounded-full border border-dashed opacity-40"
            style={ring}
          />
        </>
      )}
      <span
        className="absolute -top-1.5 -left-1.5 size-3 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 18px ${color}` }}
      />
    </div>
  );
}
