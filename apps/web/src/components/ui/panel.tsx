import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/** The rounded, faintly lit surface that holds a block of content. */
export const panelClassName = "rounded-[1.75rem] border border-white/10 bg-white/[0.02]";

interface PanelProps {
  /** Heading of the panel, also its accessible name. */
  title: string;
  /** Identifier of the heading, unique on the page. */
  id: string;
  /** Shown at the end of the heading row, such as a link to the full list. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** A titled section of a page, such as a list on the dashboard. */
export function Panel({ title, id, action, children, className = "", style }: PanelProps) {
  return (
    <section
      aria-labelledby={id}
      className={`${panelClassName} flex flex-col p-6 md:p-7 ${className}`}
      style={style}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id={id} className="text-xl font-light tracking-tight">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-5 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

interface PanelLinkProps<Href extends string> {
  href: Route<Href>;
  children: ReactNode;
}

/** A quiet link with an arrow that leans forward on hover, such as "All alerts". */
export function PanelLink<Href extends string>({ href, children }: PanelLinkProps<Href>) {
  return (
    <Link
      href={href}
      className="group text-muted focus-visible:ring-accent inline-flex shrink-0 items-center gap-1.5 rounded-sm text-sm transition-colors outline-none hover:text-neutral-100 focus-visible:ring-2"
    >
      {children}
      <ArrowRightIcon
        aria-hidden
        className="size-3.5 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
