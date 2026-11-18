import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home screen icon for iOS, which does not read SVG icons: the mark on the dark surface. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0c1014",
      }}
    >
      <svg width="132" height="132" viewBox="0 0 32 32" fill="none">
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
    size,
  );
}
