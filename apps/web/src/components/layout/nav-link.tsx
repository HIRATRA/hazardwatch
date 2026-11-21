"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavLinkProps<Href extends string> {
  href: Route<Href>;
  children: ReactNode;
}

/**
 * A header link that shows when it leads to the current page or one below
 * it, with a dot of the accent colour under it.
 */
export function NavLink<Href extends string>({ href, children }: NavLinkProps<Href>) {
  const pathname = usePathname();
  const current = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`focus-visible:ring-accent relative inline-flex items-center gap-1.5 rounded-sm py-1 transition-colors outline-none focus-visible:ring-2 ${
        current ? "text-neutral-50" : "text-muted hover:text-neutral-100"
      }`}
    >
      {children}
      <span
        aria-hidden
        className={`bg-accent absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full transition-[opacity,transform] duration-300 ${
          current ? "scale-100 opacity-100" : "scale-0 opacity-0"
        }`}
      />
    </Link>
  );
}
