import { notFound } from "next/navigation";

import { appIcon } from "@/lib/app-icon";

/** Sizes the web app manifest lists, which installable apps require. */
const sizes = ["192", "512"];

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return sizes.map((size) => ({ size }));
}

/** The application icon at one of the manifest's sizes, as a PNG. */
export async function GET(_request: Request, { params }: RouteContext<"/icons/[size]">) {
  const { size } = await params;
  if (!sizes.includes(size)) {
    notFound();
  }
  return appIcon(Number(size));
}
