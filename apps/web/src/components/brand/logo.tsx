interface LogoMarkProps {
  className?: string;
  /** Accessible name, for a mark standing alone. Decorative when omitted. */
  title?: string;
}

/**
 * The HazardWatch mark: a ring for the planet crossed by a seismogram whose
 * spike breaks out of it. The ring takes the current text colour and the
 * trace the accent colour.
 */
export function LogoMark({ className = "", title }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3 17h6.5l2.5-5.5 3 11.5 3.5-19 2.5 13h8"
        className="stroke-accent"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
