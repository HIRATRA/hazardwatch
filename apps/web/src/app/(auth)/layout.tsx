import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSession()) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="mb-8 font-mono text-sm font-semibold tracking-widest uppercase">
        HazardWatch
      </Link>
      <div className="border-border bg-surface-raised w-full max-w-sm rounded-lg border p-6">
        {children}
      </div>
    </main>
  );
}
