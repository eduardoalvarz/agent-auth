"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export type CarouselTextProps = {
  items: string[];
  intervalMs?: number;
  className?: string;
};

export default function CarouselText({
  items,
  intervalMs = 3000,
  className = "",
}: CarouselTextProps) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (items.length === 0) return;
    if (paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [items.length, intervalMs, paused]);

  const dots = Math.min(items.length, 8);
  const active = index % dots;

  // Reserve height to avoid layout shift
  return (
    <div
      className={`relative mx-auto max-w-xl overflow-hidden text-balance text-center ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="polite"
      aria-label="Ejemplos de preguntas"
    >
      <div className="h-10 sm:h-9 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ y: 16, opacity: 0, filter: "blur(6px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: -16, opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full px-2"
          >
            <p className="text-sm sm:text-base text-muted-foreground italic leading-relaxed">
              {items[index]}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {Array.from({ length: dots }).map((_, i) => (
          <span
            key={i}
            className={
              "h-1.5 w-1.5 rounded-full transition-colors " +
              (i === active ? "bg-foreground/50" : "bg-foreground/10")
            }
          />
        ))}
      </div>
    </div>
  );
}
