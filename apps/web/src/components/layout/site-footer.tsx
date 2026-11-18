import { EnvelopeSimpleIcon, GithubLogoIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";
import { Reveal } from "@/components/motion/reveal";

const AUTHOR_GITHUB = "https://github.com/HIRATRA";
const AUTHOR_EMAIL = "hiratradanarson@gmail.com";
const REPOSITORY = "https://github.com/HIRATRA/hazardwatch";

const linkClass = "text-muted transition-colors hover:text-neutral-100";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.5fr_1fr]">
        <Reveal className="max-w-sm">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-mono text-sm font-semibold tracking-widest uppercase"
          >
            <LogoMark className="size-6 text-neutral-100" />
            HazardWatch
          </Link>
          <p className="text-muted mt-5 text-sm leading-relaxed">
            Natural hazards worldwide, from open data. Data may be delayed or incomplete, so do not
            rely on it for emergency response.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 text-sm">
            <ul className="flex flex-col gap-3">
              <li>
                <Link href="/map" className={linkClass}>
                  Live map
                </Link>
              </li>
              <li>
                <Link href="/zones" className={linkClass}>
                  Watch zones
                </Link>
              </li>
            </ul>
            <ul className="flex flex-col gap-3">
              <li>
                <a href={REPOSITORY} className={linkClass}>
                  Source code
                </a>
              </li>
              <li>
                <a href={`${REPOSITORY}/issues`} className={linkClass}>
                  Report an issue
                </a>
              </li>
            </ul>
          </nav>
        </Reveal>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted">
            Designed &amp; Built by{" "}
            <a
              href={AUTHOR_GITHUB}
              className="text-neutral-100 underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-current"
            >
              Hiratra Danarson
            </a>
          </p>
          <div className="flex items-center gap-1">
            <a
              href={AUTHOR_GITHUB}
              aria-label="Hiratra Danarson on GitHub"
              className="text-muted rounded-full p-2 transition-colors hover:bg-white/5 hover:text-neutral-100"
            >
              <GithubLogoIcon className="size-5" />
            </a>
            <a
              href={`mailto:${AUTHOR_EMAIL}`}
              aria-label={`Email Hiratra Danarson at ${AUTHOR_EMAIL}`}
              className="text-muted rounded-full p-2 transition-colors hover:bg-white/5 hover:text-neutral-100"
            >
              <EnvelopeSimpleIcon className="size-5" />
            </a>
          </div>
        </div>
        <p className="text-muted/70 mx-auto max-w-7xl px-6 pb-8 text-xs">
          Events from USGS, NASA FIRMS and GDACS. Imagery from NASA GIBS. Land outlines from Natural
          Earth.
        </p>
      </div>
    </footer>
  );
}
