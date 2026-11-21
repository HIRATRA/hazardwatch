"use client";

import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useRef, type ReactNode } from "react";

import { useMotionAllowed } from "@/components/motion/use-motion-allowed";

interface GeoPictureProps {
  src: string;
  alt: string;
  sizes: string;
  /** Width of the picture divided by its height. */
  aspect: number;
  /**
   * Point of the picture, in percent from the top left, kept as close to
   * the middle as the crop allows. The middle of the picture by default.
   */
  focus?: { x: number; y: number };
  /** Extra classes for the frame holding the picture and its overlay. */
  className?: string;
  /** Drawn over the picture, in its own frame: percentages land on the picture. */
  children?: ReactNode;
}

/**
 * A picture of an area filling its positioned parent, cropped like
 * `object-fit: cover`, with an overlay that stays aligned with it, such as
 * events placed by latitude and longitude. Both drift more slowly than the
 * page as it scrolls by, as if they lay deeper.
 */
export function GeoPicture({
  src,
  alt,
  sizes,
  aspect,
  focus = { x: 50, y: 50 },
  className = "",
  children,
}: GeoPictureProps) {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);
  // As large as needed to cover the layer while keeping the picture's proportions.
  const width = `max(100cqw, 100cqh * ${aspect})`;
  const height = `max(100cqh, 100cqw / ${aspect})`;

  return (
    <div ref={ref} className="absolute inset-0 -z-10 overflow-hidden">
      {/* Taller than the tile, so that drifting never uncovers an edge. */}
      <motion.div
        style={{ y: allowed ? y : 0 }}
        className="absolute inset-x-0 -inset-y-[9%] [container-type:size]"
      >
        <div
          className={`absolute ${className}`}
          style={{
            width,
            height,
            // Centres the focus point, without uncovering an edge of the layer.
            left: `clamp(100cqw - ${width}, 50cqw - ${width} * ${focus.x / 100}, 0px)`,
            top: `clamp(100cqh - ${height}, 50cqh - ${height} * ${focus.y / 100}, 0px)`,
          }}
        >
          <Image src={src} alt={alt} fill unoptimized sizes={sizes} className="object-fill" />
          {children}
        </div>
      </motion.div>
    </div>
  );
}
