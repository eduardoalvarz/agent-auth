"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import MarkdownProse from "@/components/markdown-prose";

type Section = {
  level: number;
  title: string;
  content: string;
  id: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function splitMarkdownIntoSections(markdown: string, splitLevel = 2): { intro: string; sections: Section[] } {
  const lines = markdown.split(/\r?\n/);
  const intro: string[] = [];
  const sections: Section[] = [];
  let current: { title: string; content: string[] } | null = null;

  for (const line of lines) {
    const m = line.match(/^(#{2,6})\s+(.+?)\s*$/);
    if (m) {
      const level = m[1].length;
      const title = m[2];
      // Only start a new top-level section when the heading level matches splitLevel
      if (level === splitLevel) {
        if (current) {
          sections.push({
            level: splitLevel,
            title: current.title,
            content: current.content.join("\n").trim(),
            id: slugify(current.title),
          });
        }
        current = { title, content: [] };
        continue;
      }
    }

    if (current) current.content.push(line);
    else intro.push(line);
  }

  if (current) {
    sections.push({
      level: splitLevel,
      title: current.title,
      content: current.content.join("\n").trim(),
      id: slugify(current.title),
    });
  }

  return { intro: intro.join("\n").trim(), sections };
}

export default function MarkdownSections({
  content,
  defaultOpenTitles = ["Bases de datos"],
  splitLevel = 2,
  maxWidthClass = "max-w-[600px]",
  storageKey,
}: {
  content: string;
  defaultOpenTitles?: string[];
  splitLevel?: number;
  maxWidthClass?: string;
  storageKey?: string;
}) {
  const { intro, sections } = React.useMemo(
    () => splitMarkdownIntoSections(content, splitLevel),
    [content, splitLevel],
  );

  const [openMap, setOpenMap] = React.useState<Record<string, boolean>>({});
  // Use a stable key for defaultOpenTitles to avoid effect running on every render
  const defaultOpenKey = React.useMemo(
    () => (defaultOpenTitles && defaultOpenTitles.length ? defaultOpenTitles.join("||") : ""),
    // Only depend on the array contents, not the reference identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(defaultOpenTitles || [])],
  );

  React.useEffect(() => {
    const initial: Record<string, boolean> = {};
    let persisted: Record<string, boolean> | null = null;
    if (typeof window !== "undefined" && storageKey) {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) persisted = JSON.parse(raw);
      } catch {
        // ignore parse/storage errors
      }
    }
    for (const s of sections) {
      const fromStorage = persisted ? persisted[s.id] : undefined;
      initial[s.id] = typeof fromStorage === "boolean" ? fromStorage : defaultOpenTitles.includes(s.title);
    }
    // Avoid unnecessary state updates (which can trigger re-renders)
    const same = Object.keys(initial).length === Object.keys(openMap).length &&
      Object.keys(initial).every((k) => openMap[k] === initial[k]);
    if (!same) setOpenMap(initial);
    // We intentionally depend on defaultOpenKey (stable string) instead of the array identity
  }, [sections, storageKey, defaultOpenKey]);

  React.useEffect(() => {
    if (typeof window === "undefined" || !storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(openMap));
    } catch {
      // ignore storage errors
    }
  }, [openMap, storageKey]);

  const expandAll = React.useCallback(() => {
    setOpenMap((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const s of sections) next[s.id] = true;
      return next;
    });
  }, [sections]);

  const collapseAll = React.useCallback(() => {
    setOpenMap((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const s of sections) next[s.id] = false;
      return next;
    });
  }, [sections]);

  return (
    <div className={`mx-auto w-full ${maxWidthClass}`}>
      {intro && intro.trim().length > 0 && (
        <div className="mb-4">
          <MarkdownProse content={intro} />
        </div>
      )}

      {sections.length > 0 && (
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{sections.length} secciones</span>
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={expandAll}
            >
              Expandir todo
            </button>
            <span className="text-muted-foreground/50">•</span>
            <button
              type="button"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={collapseAll}
            >
              Contraer todo
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sections.map((sec) => (
          <details
            key={sec.id}
            className="group rounded-lg border bg-card/60 shadow-sm open:bg-card"
            open={!!openMap[sec.id]}
            onToggle={(e) => {
              const isOpen = (e.target as HTMLDetailsElement).open;
              setOpenMap((prev) => ({ ...prev, [sec.id]: isOpen }));
            }}
          >
            <summary className="flex cursor-pointer select-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-[0.95rem] font-medium hover:bg-muted/60">
              <span className="truncate">{sec.title}</span>
              <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t px-3 py-3">
              <MarkdownProse content={sec.content} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
