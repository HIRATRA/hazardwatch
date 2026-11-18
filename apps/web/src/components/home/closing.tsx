import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

/** Last call to action, over the rings of the mark. */
export function Closing() {
  return (
    <section className="relative isolate overflow-hidden border-t border-white/10">
      {/* The ring of the logo, much larger, running off the edge. */}
      <div
        aria-hidden
        className="absolute top-1/2 -right-[18rem] -z-10 size-[44rem] -translate-y-1/2 rounded-full border border-white/[0.07] md:-right-40"
      >
        <div className="absolute inset-16 rounded-full border border-white/[0.05]" />
        <div className="absolute inset-32 rounded-full border border-white/[0.04]" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-28 md:flex-row md:items-end md:justify-between md:py-40">
        <h2 className="reveal max-w-3xl text-4xl leading-[1.1] font-light tracking-tight text-balance md:text-6xl">
          Know first when it reaches your places.
        </h2>
        <Link
          href="/sign-up"
          className="reveal group bg-accent hover:bg-accent-strong focus-visible:ring-accent focus-visible:ring-offset-ink inline-flex shrink-0 items-center gap-2 self-start rounded-full py-3.5 pr-6 pl-7 text-sm font-medium text-neutral-950 transition-[background-color,transform] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] md:self-auto"
        >
          Get started
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
