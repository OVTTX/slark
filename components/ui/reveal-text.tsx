"use client";

import { useSlarkReducedMotion } from '../hooks/use-slark-reduced-motion'

import { Children, cloneElement, isValidElement, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import type { Variants } from "framer-motion";

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Lightweight class name combiner (no external dependencies required).
 */
export function cn(...inputs: (string | number | boolean | undefined | null)[]): string {
  return inputs
    .filter((val): val is string => typeof val === "string" && val.trim().length > 0)
    .join(" ");
}

/**
 * Splits a text string into an array of words while trimming excess whitespace.
 */
export function splitTextIntoWords(input: string): string[] {
  if (!input) return [];
  return input.trim().split(/\s+/);
}

/**
 * Returns fluid, responsive font-size clamp values across all screen sizes.
 * Scales fluidly from mobile (<640px) to tablet (768px-1024px) to desktop (1280px+).
 */
export function getFontSize(size: string = "display"): string {
  switch (size) {
    case "sm":
      return "clamp(0.875rem, 1.5vw, 1.125rem)";
    case "base":
      return "clamp(1rem, 2vw, 1.375rem)";
    case "lg":
      return "clamp(1.375rem, 3vw, 2rem)";
    case "xl":
      return "clamp(1.75rem, 4vw, 2.75rem)";
    case "2xl":
    case "display":
      // Big, bold, fluid typography that scales seamlessly from 320px mobile to 4k desktop
      return "clamp(2rem, 5vw, 4rem)";
    case "huge":
      return "clamp(2.5rem, 7vw, 5.5rem)";
    default:
      return size;
  }
}

/**
 * Returns ideal proportional line-height based on font scale.
 */
export function getLineHeight(size: string = "display"): number {
  switch (size) {
    case "sm":
      return 1.6;
    case "base":
      return 1.5;
    case "lg":
      return 1.35;
    case "xl":
    case "2xl":
    case "display":
    case "huge":
    default:
      return 1.2;
  }
}

/**
 * Generates framer-motion variants for container stagger and child blur/slide-up.
 */
export function createRevealVariants({
  stagger = 0.045,
  delay = 0,
  duration = 0.8,
  yOffset = 24,
  blur = 10,
}: {
  stagger?: number;
  delay?: number;
  duration?: number;
  yOffset?: number;
  blur?: number | string;
}) {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  const childVariants: Variants = {
    hidden: {
      opacity: 0,
      y: yOffset,
      filter: typeof blur === "number" ? `blur(${blur}px)` : `blur(${blur})`,
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration,
        ease: [0.215, 0.61, 0.355, 1],
      },
    },
  };

  return { containerVariants, childVariants };
}

// ─── Component Props ──────────────────────────────────────────────────────────

export interface RevealTextProps {
  /** The text string to reveal with blur & stagger. Can also be passed as children. */
  text?: string;
  /** Children can be passed as a string or element. */
  children?: ReactNode;
  /** Custom class names to merge onto the container. */
  className?: string;
  /** Size preset or CSS font-size string. Defaults to "display" (responsive clamp(2rem, 5vw, 4rem)). */
  size?: "sm" | "base" | "lg" | "xl" | "2xl" | "display" | "huge" | (string & {});
  /** HTML element type to render. Defaults to "h2". */
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
  /** Delay in seconds before animation begins. Defaults to 0. */
  delay?: number;
  /** Duration of each word's reveal animation in seconds. Defaults to 0.8. */
  duration?: number;
  /** Stagger interval between words in seconds. Defaults to 0.045. */
  stagger?: number;
  /** Starting vertical offset for the slide-up effect in px. Defaults to 24. */
  yOffset?: number;
  /** Blur intensity in pixels (e.g. 10 or "10px"). Defaults to 10. */
  blur?: number | string;
  /** Whether the reveal animation triggers only once when entering viewport. Defaults to true. */
  once?: boolean;
  /** Viewport margin for the scroll-trigger observer. Defaults to "-10% 0px". */
  viewportMargin?: string;
  /** Optional inline styles. */
  style?: CSSProperties;
  inheritTypography?: boolean;
  id?: string;
}

const MOTION_ELEMENTS = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  p: motion.p,
  span: motion.span,
  div: motion.div,
} as const;

// ─── Main Component ───────────────────────────────────────────────────────────

export const RevealText = ({
  text,
  children,
  className,
  size = "display",
  as = "h2",
  delay = 0,
  duration = 0.8,
  stagger = 0.045,
  yOffset = 24,
  blur = 10,
  once = true,
  viewportMargin = "-10% 0px",
  style,
  inheritTypography = false,
  id,
}: RevealTextProps) => {
  const reducedMotion = useSlarkReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref, {
    once,
    margin: viewportMargin as any,
  });

  const rawText = typeof children === "string" ? children : text || "";

  const { containerVariants, childVariants } = createRevealVariants({
    stagger,
    delay,
    duration,
    yOffset,
    blur,
  });

  const animateChildren = (nodes: ReactNode): ReactNode => Children.map(nodes, (node, index) => {
    if (typeof node === "string") return node.split(/(\s+)/).map((part, i) =>
      /\S/.test(part) ? <motion.span key={`${index}-${i}`} variants={childVariants} style={{ display: "inline-block" }}>{part}</motion.span> : part
    );
    if (isValidElement<{ children?: ReactNode }>(node) && node.props.children) {
      return cloneElement(node, {}, animateChildren(node.props.children));
    }
    return node;
  });

  const MotionComponent = MOTION_ELEMENTS[as] || motion.h2;
  const fontSize = getFontSize(size);
  const lineHeight = getLineHeight(size);

  return (
    <MotionComponent
      id={id}
      ref={ref as any}
      variants={containerVariants}
      initial={reducedMotion ? false : "hidden"}
      animate={reducedMotion || isInView ? "visible" : "hidden"}
      className={cn(
        !inheritTypography && "flex flex-wrap items-center justify-center text-center font-semibold tracking-tight w-full max-w-5xl mx-auto px-4 text-white",
        className
      )}
      style={inheritTypography ? style : {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontSize,
        lineHeight,
        letterSpacing: "-0.02em",
        width: "100%",
        maxWidth: "min(92vw, 68rem)",
        marginLeft: "auto",
        marginRight: "auto",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {animateChildren(children ?? rawText)}
    </MotionComponent>
  );
};

export default RevealText;

