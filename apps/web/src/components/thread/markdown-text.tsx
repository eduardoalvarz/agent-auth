"use client";

import "./markdown-styles.css";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { FC, memo, useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { SyntaxHighlighter } from "@/components/thread/syntax-highlighter";

import { TooltipIconButton } from "@/components/thread/tooltip-icon-button";
import { cn } from "@/lib/utils";

import "katex/dist/katex.min.css";

interface CodeHeaderProps {
  language?: string;
  code: string;
}

const useCopyToClipboard = ({
  copiedDuration = 3000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  };

  return { isCopied, copyToClipboard };
};

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-t-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
      <span className="lowercase [&>span]:text-xs">{language}</span>
      <TooltipIconButton
        tooltip="Copy"
        onClick={onCopy}
      >
        {!isCopied && <CopyIcon />}
        {isCopied && <CheckIcon />}
      </TooltipIconButton>
    </div>
  );
};

// Custom scrollable table with an always-visible horizontal scrollbar below when overflowing
const ScrollableTable: FC<
  { className?: string } & React.ComponentPropsWithoutRef<'table'>
> = ({ className, ...props }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [thumbLeft, setThumbLeft] = useState(0); // px
  const [thumbWidth, setThumbWidth] = useState(0); // px
  const [percent, setPercent] = useState(0); // 0-100
  const [atEnd, setAtEnd] = useState(false);
  const draggingRef = useRef(false);

  const recalc = () => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const sw = el.scrollWidth;
    let sl = el.scrollLeft;
    const isOverflowing = sw > cw + 1; // tolerate rounding
    setOverflowing(isOverflowing);
    if (!isOverflowing) {
      setThumbLeft(0);
      setThumbWidth(0);
      return;
    }
    // Use the actual visible track width for perfect mapping
    const trackEl = trackRef.current;
    const trackW = trackEl ? trackEl.clientWidth : cw;
    const minThumb = 28; // px
    const tw = Math.max((cw / sw) * trackW, minThumb);
    const maxLeft = trackW - tw;
    const scrollMax = Math.max(sw - cw, 0);
    // Snap to ends to avoid fractional off-by-ones from the browser
    if (scrollMax > 0) {
      if (scrollMax - sl <= 1) sl = scrollMax;
      if (sl <= 1) sl = 0;
    }
    const ratio = scrollMax > 0 ? sl / scrollMax : 0;
    let left = ratio * maxLeft;
    // Snap thumb to the exact edges when very close
    if (ratio >= 0.999) left = maxLeft;
    if (ratio <= 0.001) left = 0;
    setThumbWidth(tw);
    setThumbLeft(left);
    const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    setPercent(pct);
    setAtEnd(ratio >= 0.999);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => recalc();
    el.addEventListener('scroll', onScroll, { passive: true });
    recalc();
    const ro = new ResizeObserver(() => recalc());
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    // Recalc on font load/layout changes
    const tid = window.setTimeout(recalc, 0);
    return () => window.clearTimeout(tid);
  });

  const setScrollByPointer = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const trackEl = trackRef.current;
    const rect = (trackEl ?? el).getBoundingClientRect();
    const trackW = (trackEl?.clientWidth ?? el.clientWidth) || rect.width;
    const maxThumbLeft = Math.max(trackW - thumbWidth, 0);
    const x = Math.min(Math.max(clientX - rect.left - thumbWidth / 2, 0), maxThumbLeft);
    const cw = el.clientWidth;
    const sw = el.scrollWidth;
    const scrollMax = Math.max(sw - cw, 0);
    let scrollLeft = maxThumbLeft > 0 && scrollMax > 0 ? (x / maxThumbLeft) * scrollMax : 0;
    // Snap to edges if near the ends
    if (maxThumbLeft > 0) {
      if (maxThumbLeft - x <= 1) scrollLeft = scrollMax;
      if (x <= 1) scrollLeft = 0;
    }
    el.scrollLeft = scrollLeft;
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      setScrollByPointer(e.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [thumbWidth]);

  return (
    <div className="my-5 w-full">
      <div
        ref={containerRef}
        className="w-full overflow-x-auto pb-2 touch-pan-x touch-pan-y overscroll-x-contain scrollbar scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <table
          className={cn('min-w-max border-collapse', className)}
          style={{ width: 'max-content', minWidth: '100%' }}
          {...props}
        />
      </div>
      {overflowing && (
        <div
          ref={trackRef}
          className="mt-1 h-3 sm:h-2 w-full select-none rounded-none overflow-hidden bg-border cursor-pointer"
          onPointerDown={(e) => {
            draggingRef.current = true;
            setScrollByPointer(e.clientX);
            const onMove = (ev: PointerEvent) => draggingRef.current && setScrollByPointer(ev.clientX);
            const onUp = () => {
              draggingRef.current = false;
              window.removeEventListener('pointermove', onMove);
              window.removeEventListener('pointerup', onUp);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
          }}
          role="scrollbar"
          aria-label="Desplazamiento horizontal de la tabla"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          tabIndex={0}
        >
          <div
            className="relative h-full"
            style={{ width: '100%' }}
          >
            <div
              className="absolute inset-y-0 rounded-none bg-foreground/60"
              style={atEnd ? { right: 0, width: `${thumbWidth}px` } : { left: `${thumbLeft}px`, width: `${thumbWidth}px` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const defaultComponents: any = {
  h1: ({ className, ...props }: { className?: string }) => (
    <h1
      className={cn(
        "mb-8 scroll-m-20 text-4xl font-extrabold tracking-tight last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: { className?: string }) => (
    <h2
      className={cn(
        "mt-8 mb-4 scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: { className?: string }) => (
    <h3
      className={cn(
        "mt-6 mb-4 scroll-m-20 text-2xl font-semibold tracking-tight first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }: { className?: string }) => (
    <h4
      className={cn(
        "mt-6 mb-4 scroll-m-20 text-xl font-semibold tracking-tight first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }: { className?: string }) => (
    <h5
      className={cn(
        "my-4 text-lg font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }: { className?: string }) => (
    <h6
      className={cn("my-4 font-semibold first:mt-0 last:mb-0", className)}
      {...props}
    />
  ),
  p: ({ className, ...props }: { className?: string }) => (
    <p
      className={cn("mt-5 mb-5 leading-7 first:mt-0 last:mb-0", className)}
      {...props}
    />
  ),
  a: ({ className, ...props }: { className?: string }) => (
    <a
      className={cn(
        "text-primary font-medium underline underline-offset-4",
        className,
      )}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }: { className?: string }) => (
    <blockquote
      className={cn("border-l-2 pl-6 italic", className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }: { className?: string }) => (
    <ul
      className={cn("my-5 ml-6 list-disc [&>li]:mt-2", className)}
      {...props}
    />
  ),
  ol: ({ className, ...props }: { className?: string }) => (
    <ol
      className={cn("my-5 ml-6 list-decimal [&>li]:mt-2", className)}
      {...props}
    />
  ),
  hr: ({ className, ...props }: { className?: string }) => (
    <hr
      className={cn("my-5 border-b", className)}
      {...props}
    />
  ),
  table: ({ className, ...props }: { className?: string }) => (
    <ScrollableTable
      className={cn("w-full text-sm tabular-nums", className)}
      {...props}
    />
  ),
  thead: ({ className, ...props }: { className?: string }) => (
    <thead
      className={cn("text-foreground border-b border-border", className)}
      {...props}
    />
  ),
  th: ({ className, ...props }: { className?: string }) => (
    <th
      className={cn(
        "px-6 md:px-8 lg:px-10 xl:px-12 py-3.5 text-left font-bold tracking-wide text-foreground text-sm whitespace-normal break-normal align-middle leading-9 first:pl-0 last:pr-0 min-w-[10rem] sm:min-w-[12rem] lg:min-w-[14rem] xl:min-w-[16rem] [&[align=center]]:text-center [&[align=right]]:text-right",
        className,
      )}
      scope="col"
      {...props}
    />
  ),
  td: ({ className, ...props }: { className?: string }) => (
    <td
      className={cn(
        "px-6 md:px-8 lg:px-10 xl:px-12 py-3.5 text-left whitespace-normal break-normal align-middle leading-9 first:pl-0 last:pr-0 min-w-[10rem] sm:min-w-[12rem] lg:min-w-[14rem] xl:min-w-[16rem] [&[align=center]]:text-center [&[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  tr: ({ className, ...props }: { className?: string }) => (
    <tr
      className={cn(
        "m-0 border-b border-border p-0 last:border-b-0",
        className,
      )}
      {...props}
    />
  ),
  sup: ({ className, ...props }: { className?: string }) => (
    <sup
      className={cn("[&>a]:text-xs [&>a]:no-underline", className)}
      {...props}
    />
  ),
  pre: ({ className, ...props }: { className?: string }) => (
    <pre
      className={cn(
        "max-w-4xl overflow-x-auto rounded-lg bg-black text-white",
        className,
      )}
      {...props}
    />
  ),
  code: ({
    className,
    children,
    ...props
  }: {
    className?: string;
    children: React.ReactNode;
  }) => {
    const match = /language-(\w+)/.exec(className || "");

    if (match) {
      const language = match[1];
      const code = String(children).replace(/\n$/, "");

      return (
        <>
          <CodeHeader
            language={language}
            code={code}
          />
          <SyntaxHighlighter
            language={language}
            className={className}
          >
            {code}
          </SyntaxHighlighter>
        </>
      );
    }

    return (
      <code
        className={cn("rounded font-semibold", className)}
        {...props}
      >
        {children}
      </code>
    );
  },
};

const MarkdownTextImpl: FC<{ children: string }> = ({ children }) => {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={defaultComponents}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

export const MarkdownText = memo(MarkdownTextImpl);
