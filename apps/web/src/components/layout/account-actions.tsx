import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { countUnreadAlerts } from "@/lib/alerts/queries";
import { getSession } from "@/lib/session";

import { GuestActions } from "./site-header";

const MAX_DISPLAYED_COUNT = 99;

/**
 * Header actions that depend on the session. Reading the session makes the
 * page dynamic, so static pages use GuestActions instead.
 */
export async function AccountActions() {
  const session = await getSession();
  if (!session) {
    return <GuestActions />;
  }

  const unread = await countUnreadAlerts(session.user.id);

  return (
    <>
      <Link href="/dashboard" className="text-muted hover:text-neutral-100">
        Dashboard
      </Link>
      <Link
        href="/alerts"
        className="text-muted inline-flex items-center gap-1.5 hover:text-neutral-100"
      >
        Alerts
        {unread > 0 && (
          <span className="bg-accent rounded-full px-1.5 text-xs leading-5 font-semibold text-neutral-950">
            {unread > MAX_DISPLAYED_COUNT ? `${MAX_DISPLAYED_COUNT}+` : unread}
            <span className="sr-only"> unread</span>
          </span>
        )}
      </Link>
      <SignOutButton />
    </>
  );
}
