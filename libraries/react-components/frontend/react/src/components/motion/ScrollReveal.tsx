import { motion, useReducedMotion } from 'framer-motion';

import type { ReactNode } from 'react';

export type RevealDirection = 'up' | 'left' | 'right';

interface ScrollRevealProps {
  children: ReactNode;
  /** Where the content slides in from. Default 'up'. */
  direction?: RevealDirection;
  /** Delay in seconds (stagger siblings). Default 0. */
  delay?: number;
  /** How much of the element must be visible before animating. Default 0.25. */
  amount?: number;
}

const OFFSET = 60;

/**
 * Scroll-reveal wrapper: children fade + slide in when scrolled into view
 * (once). Respects the user's reduced-motion preference by rendering a plain
 * fade. Built on framer-motion's whileInView.
 */
export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  amount = 0.25,
}: ScrollRevealProps) {
  const reducedMotion = useReducedMotion();

  const offset = reducedMotion
    ? {}
    : direction === 'left'
      ? { x: -OFFSET }
      : direction === 'right'
        ? { x: OFFSET }
        : { y: OFFSET };

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
