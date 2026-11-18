"use client";

import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useRef, type ReactNode } from "react";

import { useMotionAllowed } from "./use-motion-allowed";

interface ParallaxImageProps {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
}

/**
 * An image filling its positioned parent, which drifts more slowly than the
 * page as it scrolls by, as if it lay deeper.
 */
export function ParallaxImage({ src, alt, sizes, className = "" }: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  return (
    <div ref={ref} className="absolute inset-0 -z-10 overflow-hidden">
      {/* Taller than the frame, so that drifting never uncovers an edge. */}
      <motion.div style={{ y: allowed ? y : 0 }} className="absolute inset-x-0 -inset-y-[9%]">
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes={sizes}
          className={`object-cover ${className}`}
        />
      </motion.div>
    </div>
  );
}

interface ScrollTurnProps {
  children?: ReactNode;
  className?: string;
  /** Degrees turned while the element crosses the viewport. */
  degrees?: number;
}

/** An element that turns slowly as it crosses the viewport. */
export function ScrollTurn({ children, className, degrees = 40 }: ScrollTurnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const rotate = useTransform(scrollYProgress, [0, 1], [-degrees / 2, degrees / 2]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1, 1.05]);

  return (
    <motion.div
      ref={ref}
      aria-hidden
      className={className}
      style={allowed ? { rotate, scale } : undefined}
    >
      {children}
    </motion.div>
  );
}
