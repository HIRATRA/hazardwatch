"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { forgetThisBrowser } from "@/lib/push/browser";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await forgetThisBrowser();
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <Button variant="ghost" onClick={() => void handleClick()} disabled={pending}>
      Sign out
    </Button>
  );
}
