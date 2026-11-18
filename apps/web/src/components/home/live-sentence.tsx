"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef, type ReactNode } from "react";

import { CountUp } from "@/components/motion/count-up";
import { useMotionAllowed } from "@/components/motion/use-motion-allowed";

export interface LiveSentenceItem {
  count: number;
  /** Noun agreeing with the count, such as "earthquakes". */
  label: string;
}

interface Token {
  content: ReactNode;
  /** Numbers and their nouns stand out from the rest of the sentence. */
  emphasis: boolean;
}

function toTokens(items: readonly LiveSentenceItem[]): Token[] {
  const tokens: Token[] = "In the past 24 hours, HazardWatch followed"
    .split(" ")
    .map((content) => ({ content, emphasis: false }));

  items.forEach(({ count, label }, index) => {
    if (index > 0 && index === items.length - 1) {
      tokens.push({ content: "and", emphasis: false });
    }
    tokens.push({
      content: <CountUp value={count} className="font-normal tabular-nums" />,
      emphasis: true,
    });
    const words = label.split(" ");
    words.forEach((word, wordIndex) => {
      const last = wordIndex === words.length - 1;
      const ending = !last
        ? ""
        : index === items.length - 1
          ? "."
          : index < items.length - 2
            ? ","
            : "";
      tokens.push({ content: `${word}${ending}`, emphasis: true });
    });
  });
  return tokens;
}

interface WordProps {
  token: Token;
  progress: MotionValue<number>;
  range: [number, number];
}

/** A word that lights up while the sentence scrolls through its share. */
function Word({ token, progress, range }: WordProps) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <motion.span
      style={{ opacity }}
      className={token.emphasis ? "text-neutral-50" : "text-neutral-400"}
    >
      {token.content}
    </motion.span>
  );
}

/**
 * What the past day looked like, in one sentence that lights up word by
 * word as it scrolls through the screen, its numbers counting up.
 */
export function LiveSentence({ items }: { items: readonly LiveSentenceItem[] }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const allowed = useMotionAllowed();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const tokens = toTokens(items);

  return (
    <p
      ref={ref}
      className="max-w-5xl text-3xl leading-[1.25] font-light tracking-tight text-pretty md:text-5xl"
    >
      {tokens.map((token, index) => (
        <span key={index}>
          {allowed ? (
            <Word
              token={token}
              progress={scrollYProgress}
              range={[index / tokens.length, (index + 1) / tokens.length]}
            />
          ) : (
            <span className={token.emphasis ? "text-neutral-50" : "text-neutral-400"}>
              {token.content}
            </span>
          )}{" "}
        </span>
      ))}
    </p>
  );
}
