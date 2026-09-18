"use client";

import {
  MotionConfig,
  motion,
  type Variants,
} from "framer-motion";
import type { ReactNode } from "react";

/**
 * Shared "luxe" easing — a long, soft deceleration curve that reads as
 * elegant rather than snappy.
 */
const easeLuxe: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Wraps landing page content so every motion primitive respects the
 * user's prefers-reduced-motion setting.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/* ------------------------------------------------------------------------ */
/* Scroll-triggered reveal                                                   */
/* ------------------------------------------------------------------------ */

const riseVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: easeLuxe, delay },
  }),
};

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={riseVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      custom={delay}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------------ */
/* Staggered group + items                                                   */
/* ------------------------------------------------------------------------ */

const groupVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: easeLuxe },
  },
};

const groupTags = {
  div: motion.div,
  ol: motion.ol,
  ul: motion.ul,
} as const;

export function RevealGroup({
  as = "div",
  children,
  className,
}: {
  as?: keyof typeof groupTags;
  children: ReactNode;
  className?: string;
}) {
  const Tag = groupTags[as];
  return (
    <Tag
      className={className}
      variants={groupVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

export function StaggerItemLi({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.li className={className} variants={itemVariants}>
      {children}
    </motion.li>
  );
}

/* ------------------------------------------------------------------------ */
/* Ambient loops                                                             */
/* ------------------------------------------------------------------------ */

/** Gentle vertical float — used for the portfolio preview card. */
export function Float({
  children,
  className,
  amplitude = 7,
  duration = 8,
}: {
  children: ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
}) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -amplitude, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Slow ambient drift — used for decorative gradient orbs. */
export function Drift({
  children,
  className,
  x = 24,
  y = 16,
  duration = 14,
}: {
  children: ReactNode;
  className?: string;
  x?: number;
  y?: number;
  duration?: number;
}) {
  return (
    <motion.div
      className={className}
      animate={{ x: [0, x, 0], y: [0, y, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Slow continuous rotation — used for the sparkle ornament. */
export function Spin({
  children,
  className,
  duration = 26,
}: {
  children: ReactNode;
  className?: string;
  duration?: number;
}) {
  return (
    <motion.div
      className={className}
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      {children}
    </motion.div>
  );
}
