import { appIcon } from "@/lib/app-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home screen icon for iOS, which does not read SVG icons. */
export default function AppleIcon() {
  return appIcon(size.width);
}
