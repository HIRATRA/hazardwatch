import { severityStyles } from "@/components/map/severity";

import type { ScenePoint } from "./feature-scenes";

/** Most points ringed at once, to keep the page light. */
const MAX_RINGED = 14;

/**
 * Events as glowing points on a picture, sized and coloured by severity.
 * Recent events, and those within a zone, send out rings.
 */
export function EventPoints({ points }: { points: readonly ScenePoint[] }) {
  // The list ends with the most severe, which deserve the rings.
  const ringed = new Set(
    points
      .map((point, index) => ({ point, index }))
      .filter(({ point }) => point.inZone || (point.recent && point.severity !== "minor"))
      .slice(-MAX_RINGED)
      .map(({ index }) => index),
  );

  return (
    <div aria-hidden className="absolute inset-0">
      {points.map((point, index) => {
        const { color, radius } = severityStyles[point.severity];
        const size = Math.max(4, radius * 1.1);
        return (
          <span
            key={index}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            {ringed.has(index) && (
              <span
                className="absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border motion-safe:animate-ping"
                style={{
                  borderColor: point.inZone ? "var(--color-accent)" : color,
                  animationDuration: "2.4s",
                  animationDelay: `${(index % 7) * 0.35}s`,
                }}
              />
            )}
            <span
              className="block rounded-full"
              style={{
                width: size,
                height: size,
                backgroundColor: color,
                boxShadow: `0 0 ${size * 2}px ${color}`,
                outline: point.inZone ? "1.5px solid var(--color-accent)" : undefined,
                outlineOffset: 2,
              }}
            />
          </span>
        );
      })}
    </div>
  );
}
