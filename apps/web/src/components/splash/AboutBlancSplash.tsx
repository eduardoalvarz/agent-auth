"use client";

import React, { useEffect, useMemo } from "react";
import { motion } from "framer-motion";

export default function AboutBlancSplash({
  onDone,
  durationMs = 2000,
}: {
  onDone?: () => void;
  durationMs?: number;
}) {
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    // Lock scroll while splash is visible
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const t = setTimeout(() => {
      onDone?.();
    }, prefersReducedMotion ? Math.min(600, durationMs) : durationMs);

    return () => {
      clearTimeout(t);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [onDone, durationMs, prefersReducedMotion]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
    >
      <motion.div
        initial={{ y: 40, opacity: 0, filter: "blur(8px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        transition={{
          type: prefersReducedMotion ? "tween" : "spring",
          stiffness: 200,
          damping: 24,
          duration: prefersReducedMotion ? 0.3 : 0.7,
        }}
        className="flex flex-col items-center"
      >
        <div className="text-2xl font-semibold tracking-tight text-gray-900">about:blanc</div>
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: prefersReducedMotion ? 0.2 : 0.5 }}
          className="mt-2 h-[2px] w-24 origin-left rounded-full bg-black/80"
        />
      </motion.div>
    </motion.div>
  );
}
