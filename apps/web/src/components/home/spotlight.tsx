"use client";

import { useEffect, useRef } from "react";

/** Diameter of the light, in pixels. */
const SIZE = 900;

/**
 * A soft light following the pointer over its positioned parent, as if
 * the tile were lit from where the pointer is. It shows on hover only, and
 * moves with a transform, which costs no repaint.
 */
export function Spotlight() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const light = ref.current;
    // The tile, around the clipping frame, which lets the pointer through.
    const frameElement = light?.parentElement?.parentElement;
    if (!light || !frameElement) {
      return;
    }
    let pending = 0;
    function move(event: PointerEvent) {
      const box = frameElement!.getBoundingClientRect();
      const x = event.clientX - box.left - SIZE / 2;
      const y = event.clientY - box.top - SIZE / 2;
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        light!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    }
    frameElement.addEventListener("pointermove", move);
    return () => {
      cancelAnimationFrame(pending);
      frameElement.removeEventListener("pointermove", move);
    };
  }, []);

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      <span
        ref={ref}
        className="absolute top-0 left-0 rounded-full opacity-0 transition-opacity duration-500 will-change-transform group-hover:opacity-100"
        style={{
          width: SIZE,
          height: SIZE,
          background:
            "radial-gradient(closest-side, color-mix(in oklch, white 8%, transparent), transparent)",
        }}
      />
    </span>
  );
}
