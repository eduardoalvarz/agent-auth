import React from "react";
import { File, X as XIcon } from "lucide-react";
import type { Base64ContentBlock } from "@langchain/core/messages";
import { cn } from "@/lib/utils";
import Image from "next/image";
export interface MultimodalPreviewProps {
  block: Base64ContentBlock;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  theme?: "dark" | "light"; // dark: input bar glass; light: chat bubble context
}

export const MultimodalPreview: React.FC<MultimodalPreviewProps> = ({
  block,
  removable = false,
  onRemove,
  className,
  size = "md",
  theme = "dark",
}) => {
  const isLight = theme === "light";
  // Image block
  if (
    block.type === "image" &&
    block.source_type === "base64" &&
    typeof block.mime_type === "string" &&
    block.mime_type.startsWith("image/")
  ) {
    const url = `data:${block.mime_type};base64,${block.data}`;
    let imgClass: string = cn(
      "rounded-2xl object-cover h-16 w-16 text-lg ring-1",
      isLight ? "ring-zinc-200" : "ring-white/15",
    );
    if (size === "sm")
      imgClass = cn(
        "rounded-2xl object-cover h-10 w-10 text-base ring-1",
        isLight ? "ring-zinc-200" : "ring-white/15",
      );
    if (size === "lg")
      imgClass = cn(
        "rounded-2xl object-cover h-24 w-24 text-xl ring-1",
        isLight ? "ring-zinc-200" : "ring-white/15",
      );
    return (
      <div className={cn("relative inline-block", className)}>
        <Image
          src={url}
          alt={String(block.metadata?.name || "imagen subida")}
          className={imgClass}
          width={size === "sm" ? 16 : size === "md" ? 32 : 48}
          height={size === "sm" ? 16 : size === "md" ? 32 : 48}
        />
        {removable && (
          <button
            type="button"
            className={cn(
              "absolute top-1 right-1 z-10 rounded-full p-1",
              isLight
                ? "border border-zinc-300 bg-white/90 text-zinc-700 hover:bg-white"
                : "border border-white/20 bg-black/60 text-white hover:bg-white/15",
            )}
            onClick={onRemove}
            aria-label="Eliminar imagen"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  // PDF block
  if (
    block.type === "file" &&
    block.source_type === "base64" &&
    block.mime_type === "application/pdf"
  ) {
    const filename =
      block.metadata?.filename || block.metadata?.name || "Archivo PDF";
    return (
      <div
        className={cn(
          "relative flex items-start gap-3 rounded-3xl border px-3.5 py-2",
          isLight
            ? "border-zinc-200 bg-white"
            : "border-white/20 bg-white/10 backdrop-blur-sm",
          className,
        )}
      >
        <div className="flex flex-shrink-0 flex-col items-start justify-start">
          <File
            className={cn(
              isLight ? "text-zinc-500" : "text-zinc-300",
              size === "sm" ? "h-5 w-5" : "h-7 w-7",
            )}
          />
        </div>
        <span
          className={cn(
            "min-w-0 flex-1 text-sm break-all",
            isLight ? "text-zinc-900" : "text-white/90",
          )}
          style={{ wordBreak: "break-all", whiteSpace: "pre-wrap" }}
        >
          {String(filename)}
        </span>
        {removable && (
          <button
            type="button"
            className={cn(
              "ml-2 self-start rounded-full p-1",
              isLight
                ? "border border-zinc-300 bg-white/90 text-zinc-700 hover:bg-white"
                : "border border-white/20 bg-black/60 text-white hover:bg-white/15",
            )}
            onClick={onRemove}
            aria-label="Eliminar PDF"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  // Fallback for unknown types
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-3xl border px-3.5 py-2",
        isLight
          ? "border-zinc-200 bg-white text-zinc-700"
          : "border-white/20 bg-white/10 backdrop-blur-sm text-white/80",
        className,
      )}
    >
      <File className={cn("h-5 w-5 flex-shrink-0", isLight ? "text-zinc-600" : "text-zinc-300")} />
      <span className="truncate text-xs">Tipo de archivo no compatible</span>
      {removable && (
        <button
          type="button"
          className={cn(
            "ml-2 rounded-full p-1",
            isLight
              ? "border border-zinc-300 bg-white/90 text-zinc-700 hover:bg-white"
              : "border border-white/20 bg-black/60 text-white hover:bg-white/15",
          )}
          onClick={onRemove}
          aria-label="Eliminar archivo"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
