"use client";

import { motion, type Variants } from "motion/react";
import { Fragment, type ReactNode } from "react";

/** A long, soft deceleration shared by every entrance. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

interface RevealProps {
  children?: ReactNode;
  className?: string;
  /** Seconds to wait once in view, to stagger neighbours. */
  delay?: number;
  /** Pixels the content rises from. */
  y?: number;
}

/**
 * Content that rises into place and comes into focus the first time it
 * scrolls into view.
 */
export function Reveal({ children, className, delay = 0, y = 28 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1.1, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

const word: Variants = {
  hidden: { y: "110%" },
  visible: { y: "0%", transition: { duration: 1, ease: EASE_OUT } },
};

interface RevealWordsProps {
  text: string;
  as?: "h2" | "h3" | "p";
  className?: string;
  delay?: number;
}

/** Text whose words slide up out of their line, one after the other, once in view. */
export function RevealWords({ text, as: Tag = "h2", className, delay = 0 }: RevealWordsProps) {
  return (
    <Tag className={className}>
      <motion.span
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        transition={{ staggerChildren: 0.055, delayChildren: delay }}
      >
        {text.split(" ").map((part, index) => (
          <Fragment key={index}>
            {/* Clipped with room for descenders. */}
            <span className="inline-block overflow-hidden pb-[0.12em] align-top">
              <motion.span className="inline-block" variants={word}>
                {part}
              </motion.span>
            </span>{" "}
          </Fragment>
        ))}
      </motion.span>
    </Tag>
  );
}

/** A hairline drawn from left to right once in view. */
export function DrawLine({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      aria-hidden
      className={`h-px origin-left bg-white/15 ${className}`}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 1 }}
      transition={{ duration: 1.4, delay, ease: EASE_OUT }}
    />
  );
}

interface RevealTileProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/** A tile uncovered from the bottom up, like a curtain rising, once in view. */
export function RevealTile({ children, className, delay = 0 }: RevealTileProps) {
  return (
    <motion.article
      className={className}
      initial={{ opacity: 0, clipPath: "inset(18% 0% 0% 0% round 1.75rem)" }}
      whileInView={{ opacity: 1, clipPath: "inset(0% 0% 0% 0% round 1.75rem)" }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 1.3, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.article>
  );
}
