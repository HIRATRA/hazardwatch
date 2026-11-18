import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Reveal, RevealWords } from "@/components/motion/reveal";
import { ScrollTurn } from "@/components/motion/scroll";

/** Last call to action, over the rings of the mark. */
export function Closing() {
  return (
    <section className="relative isolate overflow-hidden border-t border-white/10">
      {/* The ring of the logo, much larger, running off the edge and turning as the page scrolls. */}
      <div className="absolute top-1/2 -right-[18rem] -z-10 size-[44rem] -translate-y-1/2 md:-right-40">
        <ScrollTurn className="relative size-full rounded-full border border-white/[0.07]">
          <div className="absolute inset-16 rounded-full border border-dashed border-white/[0.06]" />
          <div className="absolute inset-32 rounded-full border border-white/[0.04]" />
          <span className="bg-accent absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full" />
        </ScrollTurn>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-28 md:flex-row md:items-end md:justify-between md:py-40">
        <RevealWords
          text="Know first when it reaches your places."
          className="max-w-3xl text-4xl leading-[1.1] font-light tracking-tight text-balance md:text-6xl"
        />
        <Reveal delay={0.35} className="shrink-0">
          <Link
            href="/sign-up"
            className="group bg-accent hover:bg-accent-strong focus-visible:ring-accent focus-visible:ring-offset-ink inline-flex items-center gap-2 rounded-full py-3.5 pr-6 pl-7 text-sm font-medium text-neutral-950 transition-[background-color,transform] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            Get started
            <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
