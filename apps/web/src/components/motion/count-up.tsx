"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

import { EASE_OUT } from "./reveal";
import { useMotionAllowed } from "./use-motion-allowed";

const numberFormat = new Intl.NumberFormat("en");

/**
 * A number that counts up from zero the first time it scrolls into view.
 * The page renders the final value, so it reads right without scripts.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const allowed = useMotionAllowed();
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const current = useMotionValue(value);
  const text = useTransform(current, (latest) => numberFormat.format(Math.round(latest)));

  // Starts from zero while out of sight, then counts up once seen.
  useEffect(() => {
    if (!allowed) {
      current.set(value);
      return;
    }
    if (!inView) {
      current.set(0);
      return;
    }
    const controls = animate(current, value, { duration: 1.8, ease: EASE_OUT });
    return () => controls.stop();
  }, [allowed, inView, value, current]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}
