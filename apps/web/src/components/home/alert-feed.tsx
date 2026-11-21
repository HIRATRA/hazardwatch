"use client";

import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { LogoMark } from "@/components/brand/logo";
import { hazardKindIcons } from "@/components/map/hazard-icons";
import { severityStyles } from "@/components/map/severity";
import { EASE_OUT } from "@/components/motion/reveal";
import { useMotionAllowed } from "@/components/motion/use-motion-allowed";
import { hazardKindNouns, hazardSeverityLabels } from "@/lib/events/format";
import { formatRelativeTime } from "@/lib/time";

import type { SceneAlert } from "./feature-scenes";

/** Time each notification stays on top, in milliseconds. */
const STEP_MS = 3200;
/** Notifications in the stack: the newest in full, the others peeking out below. */
const STACK = 3;

interface AlertFeedProps {
  alerts: readonly SceneAlert[];
  /** ISO 8601 reference time for the relative times. */
  now: string;
}

/**
 * Real events of the past day arriving one after the other as alert
 * notifications, stacked like on a phone's lock screen. The stack holds
 * still off screen and when motion is unwelcome.
 */
export function AlertFeed({ alerts, now }: AlertFeedProps) {
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const allowed = useMotionAllowed();
  const [step, setStep] = useState(0);
  const running = inView && allowed && alerts.length > STACK;

  useEffect(() => {
    if (!running) {
      return;
    }
    const timer = setInterval(() => setStep((current) => current + 1), STEP_MS);
    return () => clearInterval(timer);
  }, [running]);

  if (alerts.length === 0) {
    return null;
  }

  // The newest notification is on top; each step brings in the next event.
  const shown = Array.from({ length: Math.min(STACK, alerts.length) }, (_, depth) => {
    const index = (((step - depth) % alerts.length) + alerts.length) % alerts.length;
    return { alert: alerts[index]!, key: step - depth };
  });

  return (
    <ol ref={ref} aria-label="Examples of alerts, from real events" className="relative h-[7.5rem]">
      <AnimatePresence initial={false}>
        {shown.map(({ alert, key }, depth) => {
          const Icon = hazardKindIcons[alert.kind];
          const { color } = severityStyles[alert.severity];
          const noun = hazardKindNouns[alert.kind].one;
          return (
            <motion.li
              key={key}
              aria-hidden={depth > 0 ? true : undefined}
              className="absolute inset-x-0 top-0 origin-top"
              style={{ zIndex: STACK - depth }}
              initial={{ opacity: 0, y: -24, scale: 1.02 }}
              animate={{ opacity: 1 - depth * 0.3, y: depth * 14, scale: 1 - depth * 0.05 }}
              exit={{ opacity: 0, y: 36, scale: 0.85 }}
              transition={{ duration: 0.8, ease: EASE_OUT }}
            >
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[oklch(0.2_0.012_250)] p-3.5 shadow-2xl shadow-black/60">
                <span className="bg-ink grid size-9 shrink-0 place-items-center rounded-xl border border-white/10">
                  <LogoMark className="size-5 text-neutral-100" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-muted flex items-center justify-between gap-3 text-[0.7rem]">
                    <span className="font-medium tracking-wide uppercase">HazardWatch</span>
                    <time dateTime={alert.occurredAt}>
                      {formatRelativeTime(new Date(alert.occurredAt), new Date(now))}
                    </time>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-neutral-50">
                    <Icon aria-hidden className="size-4 shrink-0" style={{ color }} weight="fill" />
                    {hazardSeverityLabels[alert.severity]} {noun}
                  </p>
                  <p className="truncate text-xs text-neutral-300">{alert.title}</p>
                </div>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
