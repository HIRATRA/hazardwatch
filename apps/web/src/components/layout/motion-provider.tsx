"use client";

import "lenis/dist/lenis.css";

import { ReactLenis } from "lenis/react";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Smooth scrolling for every page, with Lenis easing the window scroll, and
 * the settings shared by animated components.
 *
 * Lists that scroll on their own keep native scrolling, and maps opt out
 * entirely so that the wheel zooms them. Lenis and Motion both honour the
 * user's preference for reduced motion: scrolling follows the wheel
 * exactly, and animations skip movement.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        allowNestedScroll: true,
        anchors: true,
        stopInertiaOnNavigate: true,
        autoRaf: true,
      }}
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ReactLenis>
  );
}
