import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "./auth";

/** Current session, deduplicated across a single request. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** Returns the session or redirects to the sign-in page. */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  return session;
}
