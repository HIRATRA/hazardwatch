"use client";

import "lenis/dist/lenis.css";

import { ReactLenis, type LenisRef } from "lenis/react";
import { cancelFrame, frame, MotionConfig } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Smooth scrolling for every page, with Lenis easing the window scroll, and
 * the settings shared by animated components.
 *
 * Lenis runs on Motion's frame loop rather than its own, so that each frame
 * scrolls the page and moves the scroll-linked animations together, instead
 * of one loop trailing the other by a frame.
 *
 * Lists that scroll on their own keep native scrolling, and maps opt out
 * entirely so that the wheel zooms them. Lenis and Motion both honour the
 * user's preference for reduced motion: scrolling follows the wheel
 * exactly, and animations skip movement.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    function update({ timestamp }: { timestamp: number }) {
      lenisRef.current?.lenis?.raf(timestamp);
    }
    frame.update(update, true);
    return () => cancelFrame(update);
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{
        lerp: 0.1,
        allowNestedScroll: true,
        anchors: true,
        stopInertiaOnNavigate: true,
        autoRaf: false,
      }}
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ReactLenis>
  );
}
