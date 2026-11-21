import { ImageResponse } from "next/og";

/** Background of the application icons, the darkest surface of the interface. */
export const appIconBackground = "#0c1014";

/**
 * The mark on the dark surface as a square PNG, for the platforms that do
 * not read SVG icons. The mark fills less than four fifths of the square,
 * so that platforms that crop icons into circles keep all of it.
 */
export function appIcon(size: number): ImageResponse {
  const mark = Math.round(size * 0.73);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: appIconBackground,
      }}
    >
      <svg width={mark} height={mark} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="10" stroke="#e7e5e0" strokeWidth="1.75" />
        <path
          d="M3 17h6.5l2.5-5.5 3 11.5 3.5-19 2.5 13h8"
          stroke="#f97c3d"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>,
    { width: size, height: size },
  );
}
