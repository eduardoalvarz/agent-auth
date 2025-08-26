"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export function MarkdownProse({ content }: { content: string }) {
  return (
    <div className="markdown-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }: any) => (
            <h1 className="mb-4 mt-2 text-2xl font-semibold tracking-tight md:text-3xl" {...props} />
          ),
          h2: ({ node, ...props }: any) => (
            <h2 className="mb-3 mt-6 border-b pb-1 text-xl font-semibold tracking-tight" {...props} />
          ),
          h3: ({ node, ...props }: any) => (
            <h3 className="mb-2 mt-5 text-lg font-semibold tracking-tight" {...props} />
          ),
          h4: ({ node, ...props }: any) => (
            <h4 className="mb-2 mt-4 text-base font-semibold tracking-tight text-foreground" {...props} />
          ),
          h5: ({ node, ...props }: any) => (
            <h5 className="mb-1.5 mt-3 text-[0.95rem] font-medium tracking-tight text-foreground/90" {...props} />
          ),
          h6: ({ node, ...props }: any) => (
            <h6 className="mb-1 mt-2 text-sm font-medium uppercase tracking-wide text-muted-foreground" {...props} />
          ),
          p: ({ node, ...props }: any) => (
            <p className="my-4 leading-7 text-foreground/90" {...props} />
          ),
          a: ({ node, ...props }: any) => (
            <a className="text-primary underline underline-offset-4 hover:text-primary/80" {...props} />
          ),
          ul: ({ node, ...props }: any) => (
            <ul className="my-4 list-disc space-y-2 pl-6" {...props} />
          ),
          ol: ({ node, ...props }: any) => (
            <ol className="my-4 list-decimal space-y-2 pl-6" {...props} />
          ),
          li: ({ node, ...props }: any) => <li className="leading-7" {...props} />,
          blockquote: ({ node, ...props }: any) => (
            <blockquote className="my-4 border-l-4 pl-4 italic text-muted-foreground" {...props} />
          ),
          hr: ({ node, ...props }: any) => <hr className="my-6 border-t" {...props} />,
          table: ({ node, ...props }: any) => (
            <div className="my-4 overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">
              <table className="w-full min-w-max border-collapse text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }: any) => (
            <thead className="bg-muted/50 text-foreground" {...props} />
          ),
          th: ({ node, ...props }: any) => (
            <th className="border-b px-3 py-2 text-left font-medium" {...props} />
          ),
          td: ({ node, ...props }: any) => (
            <td className="border-b px-3 py-2 align-top text-left" {...props} />
          ),
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            if (!inline && match) {
              return (
                <SyntaxHighlighter
                  style={atomDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    background: "transparent",
                  }}
                  className="my-4 overflow-hidden rounded-lg border bg-muted/80"
                  {...props}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              );
            }
            return (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]" {...props}>
                {children}
              </code>
            );
          },
          pre: ({ node, ...props }: any) => (
            <pre className="my-4 overflow-x-auto rounded-lg border bg-muted/80 p-3" {...props} />
          ),
          img: ({ node, ...props }: any) => (
            <img className="my-4 rounded-lg border" loading="lazy" {...props} />
          ),
          kbd: ({ node, ...props }: any) => (
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[0.85em]" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownProse;
