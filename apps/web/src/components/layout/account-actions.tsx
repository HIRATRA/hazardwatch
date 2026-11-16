import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { getSession } from "@/lib/session";

import { GuestActions } from "./site-header";

/**
 * Header actions that depend on the session. Reading the session makes the
 * page dynamic, so static pages use GuestActions instead.
 */
export async function AccountActions() {
  const session = await getSession();
  if (!session) {
    return <GuestActions />;
  }

  return (
    <>
      <Link href="/dashboard" className="text-muted hover:text-neutral-100">
        Dashboard
      </Link>
      <SignOutButton />
    </>
  );
}
