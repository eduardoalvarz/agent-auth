'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { motion } from 'framer-motion';

import { BlockDetector, type BlockMode } from '@/lib/detectBlocks';
import { defaultComponents } from '@/components/thread/markdown-text';
import '@/components/thread/markdown-styles.css';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';

export type StreamMarkdownFromTextProps = {
  text: string;
  resetKey?: string | number;
  className?: string;
  animations?: { duration?: number };
};

type FinalBlock = { id: string; markdown: string };

export const StreamMarkdownFromText: React.FC<StreamMarkdownFromTextProps> = ({
  text,
  resetKey,
  className,
  animations,
}) => {
  const [finalBlocks, setFinalBlocks] = useState<FinalBlock[]>([]);
  const [draft, setDraft] = useState<string>('');
  const [mode, setMode] = useState<BlockMode>(null);

  const detectorRef = useRef<BlockDetector | null>(null);
  const prevTextRef = useRef<string>('');

  // Reset on key change
  useEffect(() => {
    detectorRef.current = new BlockDetector();
    prevTextRef.current = '';
    setFinalBlocks([]);
    setDraft('');
    setMode(null);
  }, [resetKey]);

  // Feed incremental diffs as text grows
  useEffect(() => {
    if (!detectorRef.current) detectorRef.current = new BlockDetector();
    const prev = prevTextRef.current;

    // If text shrank or diverged, reset and feed full text
    const diverged = !text.startsWith(prev);
    if (diverged) {
      detectorRef.current = new BlockDetector();
      setFinalBlocks([]);
      setDraft('');
      setMode(null);
      prevTextRef.current = '';
    }

    const chunk = text.slice(prevTextRef.current.length);
    if (chunk.length === 0) return;

    const res = detectorRef.current.feed(chunk);
    if (res.closed.length) {
      setFinalBlocks((prevBlocks) => [
        ...prevBlocks,
        ...res.closed.map((markdown) => ({ id: `${prevBlocks.length}-${markdown.length}-${Date.now()}`, markdown })),
      ]);
    }
    setDraft(res.draft);
    setMode(res.mode);

    prevTextRef.current = text;
  }, [text]);

  const transition = useMemo(() => ({ duration: animations?.duration ?? 0.2, ease: 'easeOut' as const }), [animations?.duration]);
  const shouldRenderDraft = mode !== 'code' && draft.trim().length > 0;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {finalBlocks.map((b) => (
        <motion.div
          key={b.id}
          initial={{ opacity: 0, y: 8, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={transition}
        >
          <div className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={defaultComponents as any}
            >
              {b.markdown}
            </ReactMarkdown>
          </div>
        </motion.div>
      ))}

      {shouldRenderDraft && (
        <div className="whitespace-pre-wrap text-muted-foreground/90">
          {draft}
        </div>
      )}
    </div>
  );
};

export default StreamMarkdownFromText;
