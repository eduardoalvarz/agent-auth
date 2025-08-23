'use client';

import '@/components/thread/markdown-styles.css';
import 'katex/dist/katex.min.css';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';

import { BlockDetector, type BlockMode } from '@/lib/detectBlocks';
import { defaultComponents } from '@/components/thread/markdown-text';
import { cn } from '@/lib/utils';

export type StreamMarkdownProps = {
  source: AsyncIterable<string> | (() => AsyncIterable<string>);
  className?: string;
  animations?: { duration?: number };
};

type FinalBlock = { id: string; markdown: string };

export const StreamMarkdown: React.FC<StreamMarkdownProps> = ({
  source,
  className,
  animations,
}) => {
  const [finalBlocks, setFinalBlocks] = useState<FinalBlock[]>([]);
  const [draft, setDraft] = useState<string>('');
  const [mode, setMode] = useState<BlockMode>(null);

  const detectorRef = useRef<BlockDetector | null>(null);

  // Reset detector and state whenever source identity changes
  useEffect(() => {
    detectorRef.current = new BlockDetector();
    setFinalBlocks([]);
    setDraft('');
    setMode(null);

    let cancelled = false;

    async function run() {
      try {
        const iterable = typeof source === 'function' ? (source as () => AsyncIterable<string>)() : (source as AsyncIterable<string>);
        for await (const chunk of iterable) {
          if (cancelled) break;
          const res = detectorRef.current!.feed(chunk);
          if (res.closed.length) {
            setFinalBlocks((prev) => [
              ...prev,
              ...res.closed.map((markdown) => ({ id: uuidv4(), markdown })),
            ]);
          }
          setDraft(res.draft);
          setMode(res.mode);
        }
        if (!cancelled) {
          // Flush any remaining content when stream ends
          const remaining = detectorRef.current!.flush();
          if (remaining.length) {
            setFinalBlocks((prev) => [
              ...prev,
              ...remaining.map((markdown) => ({ id: uuidv4(), markdown })),
            ]);
            setDraft('');
            setMode(null);
          }
        }
      } catch (err) {
        console.error('StreamMarkdown error:', err);
      }
    }

    run();

    return () => {
      cancelled = true;
      const iteratorLike = typeof source === 'function' ? (source as any)() : (source as any);
      if (iteratorLike && typeof iteratorLike.return === 'function') {
        try {
          iteratorLike.return();
        } catch (e) {
          // Safely ignore iterator termination errors to avoid leaking subscriptions
          console.debug('Iterator return() failed (ignored)', e);
        }
      }
    };
  }, [source]);

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

export default StreamMarkdown;
