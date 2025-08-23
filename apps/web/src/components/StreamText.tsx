'use client';

import styles from './stream-text.module.css';
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type StreamTextProps = {
  text: string;
  className?: string;
  wordClassName?: string;
  durationMs?: number; // per-word animation duration
  staggerMs?: number; // per-word stagger
  resetKey?: string | number; // resets internal state when this changes
};

function splitTokensPreservingWhitespace(s: string): string[] {
  if (!s) return [];
  // Capture whitespace as separate tokens so spacing/newlines are preserved
  return s.split(/(\s+)/).filter((t) => t.length > 0);
}

export const StreamText: React.FC<StreamTextProps> = ({
  text,
  className,
  wordClassName,
  durationMs = 180,
  staggerMs = 0,
  resetKey,
}) => {
  const [tokens, setTokens] = useState<string[]>([]);
  const prevKeyRef = useRef<string | number | undefined>(resetKey);

  // Reset internal state if resetKey changes (e.g., new message)
  useEffect(() => {
    if (prevKeyRef.current !== resetKey) {
      prevKeyRef.current = resetKey;
      setTokens([]);
    }
  }, [resetKey]);

  // Append new tokens as text grows, or reset if it shrinks
  useEffect(() => {
    const nextTokens = splitTokensPreservingWhitespace(text);
    setTokens((prev) => {
      if (nextTokens.length < prev.length) return nextTokens; // reset/shrink
      if (nextTokens.length === prev.length) return prev; // no change
      return nextTokens; // append new tokens (React will mount only new ones)
    });
  }, [text]);

  return (
    <div className={cn('whitespace-pre-wrap', className)} aria-live="polite">
      {tokens.map((t, i) => {
        const isWord = t.trim().length > 0;
        if (!isWord) {
          return (
            <span key={`ws-${i}`}>{t}</span>
          );
        }
        const delay = i * staggerMs;
        return (
          <span
            key={`w-${i}-${t}`}
            className={cn(styles.streamWord, 'inline-block align-baseline will-change-transform', wordClassName)}
            style={{ animationDuration: `${durationMs}ms`, animationDelay: `${delay}ms` }}
          >
            {t}
          </span>
        );
      })}
    </div>
  );
};

export default StreamText;
