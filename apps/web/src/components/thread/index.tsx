"use client";
import { v4 as uuidv4 } from "uuid";
import { ReactNode, useEffect, useRef, useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/providers/Stream";
import { Button } from "../ui/button";
import { Checkpoint, Message } from "@langchain/langgraph-sdk";
import { AssistantMessage, AssistantMessageLoading } from "./messages/ai";
import { HumanMessage } from "./messages/human";
import {
  DO_NOT_RENDER_ID_PREFIX,
  ensureToolCallsHaveResponses,
} from "@/lib/ensure-tool-responses";
import { TooltipIconButton } from "./tooltip-icon-button";
import {
  ArrowDown,
  ArrowUp,
  LoaderCircle,
  PanelRightOpen,
  PanelRightClose,
  SquarePen,
  XIcon,
  Plus,
  Mic,
  Square,
  Wrench,
  Database,
} from "lucide-react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import ThreadHistory from "./history";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { getSupabaseClient } from "@/lib/auth/supabase-client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useFileUpload } from "@/hooks/use-file-upload";
import { ContentBlocksPreview } from "./ContentBlocksPreview";
import {
  useArtifactOpen,
  ArtifactContent,
  ArtifactTitle,
  useArtifactContext,
} from "./artifact";

function StickyToBottomContent(props: {
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const context = useStickToBottomContext();
  return (
    <div
      ref={context.scrollRef}
      style={{
        width: "100%",
        height: "100%",
        WebkitOverflowScrolling: "touch",
        paddingLeft: "max(env(safe-area-inset-left), 0px)",
        paddingRight: "max(env(safe-area-inset-right), 0px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
      }}
      className={props.className}
    >
      <div
        ref={context.contentRef}
        className={props.contentClassName}
      >
        {props.content}
      </div>

      {props.footer}
    </div>
  );
}

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;
  return (
    <Button
      variant="outline"
      className={cn("bg-[#f5f5f5] border border-[#e5e5e5] text-zinc-900 hover:bg-black/5 hover:text-zinc-900 focus-visible:ring-black/10", props.className)}
      onClick={() => scrollToBottom()}
    >
      <ArrowDown className="h-4 w-4 text-zinc-900" />
      <span>Ir al final</span>
    </Button>
  );
}

export function Thread() {
  const [artifactContext, setArtifactContext] = useArtifactContext();
  const [artifactOpen, closeArtifact] = useArtifactOpen();

  const [threadId, _setThreadId] = useQueryState("threadId");
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(false),
  );
  const [hideToolCalls, setHideToolCalls] = useQueryState(
    "hideToolCalls",
    parseAsBoolean.withDefault(false),
  );
  const [input, setInput] = useState<string>("");
  const {
    contentBlocks,
    setContentBlocks,
    handleFileUpload,
    dropRef,
    removeBlock,
    dragOver,
    handlePaste,
  } = useFileUpload();
  const [firstTokenReceived, setFirstTokenReceived] = useState(false);
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");

  const stream = useStreamContext();
  const messages = stream.messages;
  const isLoading = stream.isLoading;

  const lastError = useRef<string | undefined>(undefined);

  // --- Voice recording / transcription state ---
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerIntervalRef = useRef<number | null>(null);
  const autoStopTimeoutRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");
  const canceledRef = useRef<boolean>(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const caretStartRef = useRef<number | null>(null);
  const caretEndRef = useRef<number | null>(null);
  const preRecordInputRef = useRef<string>("");
  const pendingCaretRef = useRef<number | null>(null);

  const formatElapsed = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const mm = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const stopTimers = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (autoStopTimeoutRef.current) {
      window.clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }
  };

  const cleanupAudio = () => {
    // Simplified cleanup (no waveform/audio graph)
    mediaRecorderRef.current = null;
  };

  const transcribeAudio = async (blob: Blob) => {
    try {
      setIsTranscribing(true);
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      let jwt = session?.access_token;

      const form = new FormData();
      const ext = mimeTypeRef.current.includes("mp4") ? "mp4" : "webm";
      form.append("audio", blob, `speech.${ext}`);

      const doFetch = async () =>
        fetch("/api/transcribe", {
          method: "POST",
          headers: jwt
            ? {
                Authorization: `Bearer ${jwt}`,
                "x-supabase-access-token": jwt,
              }
            : undefined,
          body: form,
        });

      let res = await doFetch();
      if (res.status === 401) {
        // retry once after refresh to follow our auth strategy
        await supabase.auth.refreshSession();
        const refreshed = await supabase.auth.getSession();
        jwt = refreshed.data.session?.access_token;
        res = await doFetch();
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error || `Error ${res.status}`);
      }
      const data = (await res.json()) as { text?: string };
      const text = (data?.text || "").trim();
      if (text) {
        const base = preRecordInputRef.current ?? input;
        let start = caretStartRef.current ?? base.length;
        let end = caretEndRef.current ?? start;
        if (start > base.length) start = base.length;
        if (end > base.length) end = base.length;
        const before = base.slice(0, start);
        const after = base.slice(end);
        const needsSpace = before.length > 0 && !/\s$/.test(before) && text.length > 0;
        const insertion = needsSpace ? ` ${text}` : text;
        const newVal = `${before}${insertion}${after}`;
        pendingCaretRef.current = (before + insertion).length;
        setInput(newVal);
        // reset saved selection to avoid stale positions on next recording
        caretStartRef.current = null;
        caretEndRef.current = null;
        preRecordInputRef.current = newVal;
      } else {
        toast.info("Sin texto detectable", {
          description: "No se detectó voz en el audio.",
        });
      }
    } catch (e: any) {
      toast.error("Transcripción fallida", {
        description: e?.message || "No fue posible transcribir el audio.",
        richColors: true,
        closeButton: true,
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    try {
      if (isRecording || isTranscribing) return;
      if (!navigator?.mediaDevices?.getUserMedia) {
        toast.error("Micrófono no disponible", {
          description: "Tu navegador no permite acceso al micrófono.",
        });
        return;
      }

      // Save caret position and current input so we can insert the transcription there
      preRecordInputRef.current = input;
      const el = inputRef.current;
      if (el) {
        try {
          caretStartRef.current = el.selectionStart ?? input.length;
          caretEndRef.current = el.selectionEnd ?? caretStartRef.current;
        } catch (err) {
          console.debug("Failed to read caret position", err);
          caretStartRef.current = input.length;
          caretEndRef.current = caretStartRef.current;
        }
      } else {
        caretStartRef.current = input.length;
        caretEndRef.current = caretStartRef.current;
      }

      canceledRef.current = false;
      setElapsedMs(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4;codecs=mp4a.40.2",
        "audio/mp4",
      ];
      let chosen: string | undefined;
      for (const t of mimeCandidates) {
        try {
          if ((MediaRecorder as any).isTypeSupported?.(t)) {
            chosen = t;
            break;
          }
        } catch (err) {
          console.debug("MediaRecorder.isTypeSupported check failed", err);
        }
      }
      if (chosen) mimeTypeRef.current = chosen;

      const recorder = new MediaRecorder(
        stream,
        chosen ? { mimeType: chosen } : undefined,
      );
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e: any) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch (err) {
          console.debug("Error stopping audio tracks", err);
        }
        cleanupAudio();
        // If the recording duration is effectively 0s or there are no chunks, treat as too short and do not transcribe
        try {
          const secs = Math.floor((Date.now() - startedAt) / 1000);
          if (secs <= 0 || !chunksRef.current.length) {
            chunksRef.current = [];
            if (!canceledRef.current) {
              toast.info("Audio demasiado corto", {
                description: "La grabación fue muy corta (00:00). Intenta de nuevo.",
              });
            }
            if (canceledRef.current) canceledRef.current = false;
            // We set isTranscribing(true) on stop; revert it here since we won't transcribe
            setIsTranscribing(false);
            return;
          }
        } catch (err) {
          console.debug("short-audio check failed", err);
        }
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        chunksRef.current = [];
        if (canceledRef.current) {
          canceledRef.current = false;
          // If canceled after pressing stop, ensure we revert transcribing state
          setIsTranscribing(false);
          return;
        }
        await transcribeAudio(blob);
      };

      const startedAt = Date.now();
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAt);
      }, 250);

      if (autoStopTimeoutRef.current) window.clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = window.setTimeout(() => {
        stopRecording();
      }, 60000);

      setIsRecording(true);
      recorder.start();
    } catch (e: any) {
      console.error(e);
      toast.error("No se pudo iniciar la grabación", {
        description: e?.message || "Verifica permisos del micrófono.",
      });
      setIsRecording(false);
      stopTimers();
      try {
        const rec = mediaRecorderRef.current;
        if (rec && rec.state !== "inactive") rec.stop();
      } catch (err) {
        console.debug("Recorder stop after start error", err);
      }
      cleanupAudio();
    }
  };

  const stopRecording = () => {
    try {
      // Prevent textarea from flashing back before transcription starts
      setIsTranscribing(true);
      setIsRecording(false);
      stopTimers();
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
    } catch (err) {
      console.debug("stopRecording error", err);
    }
  };

  const cancelRecording = () => {
    try {
      canceledRef.current = true;
      setIsRecording(false);
      stopTimers();
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
    } catch (err) {
      console.debug("cancelRecording error", err);
    }
  };

  const setThreadId = (id: string | null) => {
    _setThreadId(id);

    // close artifact and reset artifact context
    closeArtifact();
    setArtifactContext({});
  };

  useEffect(() => {
    if (!stream.error) {
      lastError.current = undefined;
      return;
    }
    try {
      const message = (stream.error as any).message;
      if (!message || lastError.current === message) {
        // Message has already been logged. do not modify ref, return early.
        return;
      }

      // Message is defined, and it has not been logged yet. Save it, and send the error
      lastError.current = message;
      toast.error("Ocurrió un error. Por favor, inténtalo de nuevo.", {
        description: (
          <p>
            <strong>Error:</strong> <code>{message}</code>
          </p>
        ),
        richColors: true,
        closeButton: true,
      });
    } catch (err) {
      console.debug("toast error handling failed", err);
    }
  }, [stream.error]);

  // TODO: this should be part of the useStream hook
  const prevMessageLength = useRef(0);
  useEffect(() => {
    if (
      messages.length !== prevMessageLength.current &&
      messages?.length &&
      messages[messages.length - 1].type === "ai"
    ) {
      setFirstTokenReceived(true);
    }

    prevMessageLength.current = messages.length;
  }, [messages]);

  useEffect(() => {
    return () => {
      try {
        stopTimers();
        const rec = mediaRecorderRef.current;
        if (rec && rec.state !== "inactive") rec.stop();
      } catch (err) {
        console.debug("cleanup on unmount failed", err);
      }
    };
  }, []);

  useEffect(() => {
    // After recording/transcribing ends, restore focus and caret to the insertion point
    if (!isRecording && !isTranscribing && pendingCaretRef.current != null) {
      const el = inputRef.current;
      if (el) {
        const pos = Math.min(pendingCaretRef.current, el.value.length);
        try {
          el.focus();
          el.setSelectionRange(pos, pos);
        } catch (err) {
          console.debug("restore caret failed", err);
        }
      }
      pendingCaretRef.current = null;
    }
  }, [isRecording, isTranscribing]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((input.trim().length === 0 && contentBlocks.length === 0) || isLoading)
      return;

    setFirstTokenReceived(false);

    const newHumanMessage: Message = {
      id: uuidv4(),
      type: "human",
      content: [
        ...(input.trim().length > 0 ? [{ type: "text", text: input }] : []),
        ...contentBlocks,
      ] as Message["content"],
    };

    const toolMessages = ensureToolCallsHaveResponses(stream.messages);

    const dsContext = selectedDatasets.length
      ? { selectedDatasets }
      : undefined;
    const context =
      Object.keys(artifactContext).length > 0
        ? { ...artifactContext, ...dsContext }
        : dsContext;

    try {
      stream.submit(
        { messages: [...toolMessages, newHumanMessage], context },
        {
          streamMode: ["values"],
          optimisticValues: (prev) => ({
            ...prev,
            context,
            messages: [
              ...(prev.messages ?? []),
              ...toolMessages,
              newHumanMessage,
            ],
          }),
        },
      );

      setInput("");
      setContentBlocks([]);
    } catch (error: any) {
      // Handle server overload and other errors
      if (
        error?.error?.type === "overloaded_error" ||
        error?.message?.includes("Overloaded")
      ) {
        toast.error("Servidor temporalmente saturado", {
          description: "El servidor de IA está ocupado. Inténtalo de nuevo en un momento.",
          duration: 6000,
        });
      } else {
        toast.error("Solicitud fallida", {
          description: "Ocurrió un error al procesar tu mensaje.",
          duration: 5000,
        });
      }

      console.error("Submit error:", error);
    }
  };

  const handleRegenerate = async (
    parentCheckpoint: Checkpoint | null | undefined,
  ) => {
    // Do this so the loading state is correct
    prevMessageLength.current = prevMessageLength.current - 1;
    setFirstTokenReceived(false);

    try {
      stream.submit(undefined, {
        checkpoint: parentCheckpoint,
        streamMode: ["values"],
      });
    } catch (error: any) {
      // Handle server overload and other errors
      if (
        error?.error?.type === "overloaded_error" ||
        error?.message?.includes("Overloaded")
      ) {
        toast.error("Servidor temporalmente saturado", {
          description: "El servidor de IA está ocupado. Inténtalo de nuevo en un momento.",
          duration: 6000,
        });
      } else {
        toast.error("La regeneración falló", {
          description: "Ocurrió un error al regenerar el mensaje.",
          duration: 5000,
        });
      }

      console.error("Regenerate error:", error);
    }
  };

  const chatStarted = !!threadId || !!messages.length;
  const hasNoAIOrToolMessages = !messages.find(
    (m) => m.type === "ai" || m.type === "tool",
  );

  // --- Dataset picker state ---
  // Note: purely UI for now; we include it in the streaming context for future backend use.
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [datasetsMenuOpen, setDatasetsMenuOpen] = useState(false);
  const DATASET_GROUPS: Array<{
    company: string;
    datasets: { id: string; label: string }[];
  }> = [
    {
      company: "COOP",
      datasets: [
        { id: "coop_sellout", label: "coop_sellout" },
        { id: "coop_inventarios", label: "coop_inventarios" },
      ],
    },
    { company: "DEMO", datasets: [] },
    { company: "HÉRCULES", datasets: [] },
    { company: "PINKCHELADAS", datasets: [] },
  ];

  const labelMap: Record<string, string> = {
    coop_sellout: "COOP sellout",
    coop_inventarios: "COOP inventarios",
  };
  
  // Map display name to slug used in DB (lowercase)
  const COMPANY_SLUG_FOR_DISPLAY: Record<string, string> = {
    COOP: "coop",
    DEMO: "demo",
    "HÉRCULES": "hercules",
    PINKCHELADAS: "pinkcheladas",
  };

  // Allowed companies for the current user (enabled=true), from user_company_access via RLS
  const [allowedCompanySlugs, setAllowedCompanySlugs] = useState<Set<string>>(new Set());
  const [allowedLoading, setAllowedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setAllowedLoading(true);
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("user_company_access")
          .select("company_slug, enabled")
          .eq("enabled", true);
        if (!cancelled) {
          if (!error && data) {
            setAllowedCompanySlugs(
              new Set(
                data.map((r: any) => String(r.company_slug || "").toLowerCase()),
              ),
            );
          } else {
            setAllowedCompanySlugs(new Set());
          }
        }
      } finally {
        if (!cancelled) setAllowedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const VISIBLE_GROUPS = DATASET_GROUPS.filter((group) => {
    const slug = COMPANY_SLUG_FOR_DISPLAY[group.company];
    return slug ? allowedCompanySlugs.has(slug) : false;
  });
  const selectedSummary = () => {
    if (!selectedDatasets.length) return "Selecciona una base de datos";
    return selectedDatasets
      .map((id) => labelMap[id] || id)
      .join(" · ");
  };
  // removed unused chipDotColor

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="relative hidden lg:flex">
        <motion.div
          className="absolute z-20 h-full overflow-hidden border-r bg-white"
          style={{ width: 300 }}
          animate={
            isLargeScreen
              ? { x: chatHistoryOpen ? 0 : -300 }
              : { x: chatHistoryOpen ? 0 : -300 }
          }
          initial={{ x: -300 }}
          transition={
            isLargeScreen
              ? { type: "spring", stiffness: 300, damping: 30 }
              : { duration: 0 }
          }
        >
          <div
            className="relative h-full"
            style={{ width: 300 }}
          >
            <ThreadHistory />
          </div>
        </motion.div>
      </div>

      <div
        className={cn(
          "grid w-full min-h-0 grid-cols-[1fr_0fr] transition-all duration-500",
          artifactOpen && "grid-cols-[3fr_2fr]",
        )}
      >
        <motion.div
          className={cn(
            "relative flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden",
            !chatStarted && "grid-rows-[1fr]",
          )}
          layout={isLargeScreen}
          animate={{
            marginLeft: chatHistoryOpen ? (isLargeScreen ? 300 : 0) : 0,
            width: chatHistoryOpen
              ? isLargeScreen
                ? "calc(100% - 300px)"
                : "100%"
              : "100%",
          }}
          transition={
            isLargeScreen
              ? { type: "spring", stiffness: 300, damping: 30 }
              : { duration: 0 }
          }
        >
          {!chatStarted && (
            <div className="absolute top-0 left-0 z-10 flex w-full items-center justify-between gap-3 p-2 pl-4">
              <div>
                {(!chatHistoryOpen || !isLargeScreen) && (
                  <Button
                    className="hover:bg-gray-100"
                    variant="ghost"
                    onClick={() => setChatHistoryOpen((p) => !p)}
                  >
                    {chatHistoryOpen ? (
                      <PanelRightOpen className="size-5" />
                    ) : (
                      <PanelRightClose className="size-5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
          {chatStarted && (
            <div className="relative z-10 flex items-center justify-between gap-3 p-2">
              <div className="relative flex items-center justify-start gap-2">
                <div className="absolute left-0 z-10">
                  {(!chatHistoryOpen || !isLargeScreen) && (
                    <Button
                      className="hover:bg-gray-100"
                      variant="ghost"
                      onClick={() => setChatHistoryOpen((p) => !p)}
                    >
                      {chatHistoryOpen ? (
                        <PanelRightOpen className="size-5" />
                      ) : (
                        <PanelRightClose className="size-5" />
                      )}
                    </Button>
                  )}
                </div>
                <motion.button
                  className="flex cursor-pointer items-center gap-2"
                  onClick={() => setThreadId(null)}
                  animate={{
                    marginLeft: !chatHistoryOpen ? 48 : 0,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <span className="text-xl font-semibold tracking-tight">
                    about:<span className="text-muted-foreground">chat</span>
                  </span>
                  {/* <span className=" text-0xl text-muted-foreground italic">
                    retailer-demo
                  </span> */}
                </motion.button>
              </div>

              <div className="flex items-center gap-2">
                <TooltipIconButton
                  size="lg"
                  className={cn(
                    "p-4",
                    hideToolCalls
                      ? "text-zinc-400 hover:text-zinc-600"
                      : "text-zinc-900 hover:text-zinc-900",
                  )}
                  tooltip={hideToolCalls ? "Mostrar tools" : "Ocultar tools"}
                  variant="ghost"
                  aria-pressed={hideToolCalls}
                  onClick={() => setHideToolCalls((p) => !p)}
                >
                  <Wrench className="size-5" />
                </TooltipIconButton>
                <TooltipIconButton
                  size="lg"
                  className="p-4"
                  tooltip="Nuevo chat"
                  variant="ghost"
                  onClick={() => setThreadId(null)}
                >
                  <SquarePen className="size-5" />
                </TooltipIconButton>
              </div>

              <div className="from-background to-background/0 absolute inset-x-0 top-full h-5 bg-gradient-to-b" />
            </div>
          )}

          <StickToBottom className="relative flex-1 min-h-0 overflow-hidden">
            <StickyToBottomContent
              className={cn(
                "absolute inset-0 overflow-y-scroll overflow-x-hidden px-4 touch-pan-y overscroll-y-contain [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent",
                !chatStarted && "mt-[25vh] flex flex-col items-stretch",
                chatStarted && "grid grid-rows-[1fr_auto]",
              )}
              contentClassName="pt-8 pb-28 sm:pb-12 lg:pb-16 max-w-3xl mx-auto flex flex-col gap-3 w-full min-w-0"
              content={
                <>
                  {messages
                    .filter((m) => !m.id?.startsWith(DO_NOT_RENDER_ID_PREFIX))
                    .map((message, index) =>
                      message.type === "human" ? (
                        <HumanMessage
                          key={message.id || `${message.type}-${index}`}
                          message={message}
                          isLoading={isLoading}
                        />
                      ) : (
                        <AssistantMessage
                          key={message.id || `${message.type}-${index}`}
                          message={message}
                          isLoading={isLoading}
                          handleRegenerate={handleRegenerate}
                        />
                      ),
                    )}
                  {/* Special rendering case where there are no AI/tool messages, but there is an interrupt.
                    We need to render it outside of the messages list, since there are no messages to render */}
                  {hasNoAIOrToolMessages && !!stream.interrupt && (
                    <AssistantMessage
                      key="interrupt-msg"
                      message={undefined}
                      isLoading={isLoading}
                      handleRegenerate={handleRegenerate}
                    />
                  )}
                  {isLoading && !firstTokenReceived && (
                    <AssistantMessageLoading />
                  )}
                </>
              }
              footer={
                <div
                  className="sticky bottom-0 flex flex-col items-center bg-white"
                  style={{
                    paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
                    paddingLeft: 'max(env(safe-area-inset-left), 0px)',
                    paddingRight: 'max(env(safe-area-inset-right), 0px)',
                  }}
                >
                  {!chatStarted && (
                    <div className="flex flex-col items-center gap-0 mb-6">
                      <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-semibold tracking-tight">
                          about:<span className="text-muted-foreground">chat</span>
                        </h1>
                        
                      </div>
                      {/* <span className="text-muted-foreground"> 
                      <span className="italic">retailer-demo</span>                       
                        <span> | about:chat </span>
                      </span> */}
                    </div>
                  )}
                  
                  <ScrollToBottom className="animate-in fade-in-0 zoom-in-95 absolute bottom-full left-1/2 mb-4 -translate-x-1/2" />
                  <div
                    ref={dropRef}
                    className={cn(
                      "relative z-10 mx-auto mb-2 sm:mb-3 md:mb-4 w-full max-w-3xl rounded-[2rem] bg-transparent transition-all",
                      dragOver
                        ? "border-white/50 border-2 border-dotted p-1"
                        : undefined
                    )}
                  >
                    <form
                      onSubmit={handleSubmit}
                      className="mx-auto max-w-3xl"
                    >
                      <div className="mx-1 rounded-4xl overflow-hidden border border-white/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-black/20 focus-within:ring-1 focus-within:ring-white/30">
                        <ContentBlocksPreview
                          blocks={contentBlocks}
                          onRemove={removeBlock}
                          className="px-2 pt-2 pb-0"
                        />
                        <div className="relative flex items-center gap-2 px-3.5 py-2">
                          {/* Left: Bases trigger + chips (content-sized, capped at 1/3) */}
                          <div className="flex items-center gap-2 sm:max-w-[33%] min-w-0 flex-grow-0 flex-shrink">
                          {/* Database trigger and selection */}
                          <DropdownMenu.Root open={datasetsMenuOpen} onOpenChange={setDatasetsMenuOpen}>
                            <DropdownMenu.Trigger asChild>
                              <button
                                type="button"
                                className="flex h-10 items-center gap-2 text-white/70 hover:text-white focus:outline-none"
                                title="Seleccionar bases de datos"
                                aria-label={selectedDatasets.length ? `${selectedDatasets.length} bases seleccionadas` : "Seleccionar bases de datos"}
                              >
                                <Database className="size-4" />
                                <span className="hidden sm:inline text-[11px] uppercase tracking-wide leading-5">Bases</span>
                                {selectedDatasets.length > 0 && (
                                  <span className="sm:hidden inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-white/20 text-[11px] leading-4 font-medium text-white/90">
                                    {selectedDatasets.length}
                                  </span>
                                )}
                              </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content
                                side="bottom"
                                align="start"
                                sideOffset={12}
                                alignOffset={96}
                                collisionPadding={24}
                                className="z-50 min-w-[220px] rounded-3xl border border-white/15 bg-black/80 backdrop-blur-sm text-white p-1.5 shadow-lg shadow-black/30 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                              >
                                {VISIBLE_GROUPS.map((group, gi) => (
                                  <div key={group.company} className="px-1 py-0.5">
                                    <DropdownMenu.Label className="px-2 py-1 text-[10px] uppercase tracking-wide text-white/50">
                                      {group.company}
                                    </DropdownMenu.Label>
                                    {group.datasets.length ? (
                                      group.datasets.map((d) => {
                                        const checked = selectedDatasets.includes(d.id);
                                        return (
                                          <DropdownMenu.CheckboxItem
                                            key={d.id}
                                            checked={checked}
                                            onCheckedChange={(v) => {
                                              const isChecked = v === true;
                                              setSelectedDatasets((prev) => {
                                                const set = new Set(prev);
                                                if (isChecked) set.add(d.id);
                                                else set.delete(d.id);
                                                return Array.from(set);
                                              });
                                            }}
                                            className="relative flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-white/90 hover:bg-white/10 data-[highlighted]:bg-white/10 data-[highlighted]:text-white data-[state=checked]:bg-white/15 data-[state=checked]:text-white focus:bg-white/10 focus:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 transition-colors"
                                          >
                                            <span className="flex-1">{d.label}</span>
                                          </DropdownMenu.CheckboxItem>
                                        );
                                      })
                                    ) : (
                                      <div className="px-2 py-1 text-xs text-white/60">Próximamente</div>
                                      )}
                                    {gi < DATASET_GROUPS.length - 1 && (
                                      <DropdownMenu.Separator className="my-1 h-px bg-white/15" />
                                    )}
                                  </div>
                                ))}
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                          {/* Selected dataset chips (condensed) */}
                          {selectedDatasets.length > 0 && (
                            <div
                              className="hidden sm:flex min-w-0 flex-wrap items-center gap-1"
                              aria-label={selectedSummary()}
                            >
                              {selectedDatasets.map((id) => (
                                <span
                                  key={id}
                                  className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-xs text-white/90 mr-1 hover:bg-white/10 ring-1 ring-white/10 transition-colors"
                                >
                                  <span className="truncate max-w-[10rem]">{labelMap[id] || id}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedDatasets((prev) => prev.filter((x) => x !== id))
                                    }
                                    className="ml-0.5 inline-flex items-center justify-center rounded-full p-0.5 hover:bg-white/10 active:bg-white/20 transition-colors"
                                    aria-label={`Quitar ${labelMap[id] || id}`}
                                  >
                                    <XIcon className="size-3.5 text-white/70" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          </div>
                          {/* Dynamic divider between left and right */}
                          <div className="mx-1 h-5 w-px bg-white" />
                          {/* Right: input area (fills remaining space) */}
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                          {!(isRecording || isTranscribing) && (
                          <textarea
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onPaste={handlePaste}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              !e.shiftKey &&
                              !e.metaKey &&
                              !e.nativeEvent.isComposing
                            ) {
                              e.preventDefault();
                              const el = e.target as HTMLElement | undefined;
                              const form = el?.closest("form");
                              form?.requestSubmit();
                            }
                          }}
                          placeholder="Pregunta lo que quieras..."
                          rows={1}
                          className="field-sizing-content flex-1 min-h-[40px] resize-none border-none bg-transparent px-2 py-2 text-base sm:text-sm leading-5 text-white placeholder:text-white/60 shadow-none ring-0 outline-none focus:ring-0 focus:outline-none max-h-36 overflow-y-auto caret-white selection:bg-white/10 selection:text-inherit"
                        />
                          )}
                          <div className="ml-auto flex items-center gap-1.5">
                          {contentBlocks.length === 0 && (
                            <TooltipIconButton
                              tooltip="Adjuntar archivos"
                              variant="ghost"
                              size="icon"
                              className="p-1.5 rounded-full hover:bg-white/10 text-white focus-visible:ring-white/20"
                              onClick={() =>
                                document.getElementById("file-input")?.click()
                              }
                            >
                              <Plus className="size-5 text-white" />
                            </TooltipIconButton>
                          )}
                          {/* Voice bar */}
                          {(isRecording || isTranscribing) ? (
                            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2 py-1 shrink-0">
                              <button
                                type="button"
                                onClick={cancelRecording}
                                disabled={isTranscribing}
                                title={isTranscribing ? "Procesando..." : "Cancelar"}
                                aria-label="Cancelar grabación"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-50"
                              >
                                <XIcon className="size-4 text-white/80" />
                              </button>
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse"
                                  aria-hidden="true"
                                />
                                <span className="text-[11px] text-white/80 tabular-nums min-w-[42px] text-right">
                                  {formatElapsed(elapsedMs)}
                                </span>
                              </div>
                              {isTranscribing ? (
                                <div
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-zinc-900"
                                  title="Transcribiendo..."
                                  aria-label="Transcribiendo"
                                >
                                  <LoaderCircle className="size-4 animate-spin" />
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={stopRecording}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-300"
                                  title="Detener"
                                  aria-label="Detener grabación"
                                >
                                  <Square className="size-4" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <TooltipIconButton
                              tooltip="Hablar"
                              variant="ghost"
                              size="icon"
                              className="p-1.5 rounded-full hover:bg-white/10 text-white focus-visible:ring-white/20"
                              onClick={startRecording}
                              aria-label="Hablar"
                            >
                              <Mic className="size-5 text-white" />
                            </TooltipIconButton>
                          )}
                          <input
                            id="file-input"
                            type="file"
                            onChange={handleFileUpload}
                            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                            className="hidden"
                          />
                          {stream.isLoading ? (
                            <button
                              type="button"
                              onClick={() => stream.stop()}
                              className="inline-flex size-8 items-center justify-center rounded-full bg-white/80 text-zinc-900 hover:bg-white focus-visible:ring-2 focus-visible:ring-white/30"
                              title="Detener"
                            >
                              <LoaderCircle className="size-4 animate-spin" />
                            </button>
                          ) : (
                            <button
                              type="submit"
                              disabled={
                                isLoading || (!input.trim() && contentBlocks.length === 0)
                              }
                              className="inline-flex size-8 items-center justify-center rounded-full bg-white text-zinc-900 hover:bg-white/90 disabled:bg-white/20 disabled:text-white/60 focus-visible:ring-2 focus-visible:ring-white/30"
                              title="Enviar"
                            >
                              <ArrowUp className="size-4" />
                            </button>
                          )}
                        </div>
                        </div>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              }
            />
          </StickToBottom>
        </motion.div>
        <div className="relative flex flex-col border-l">
          <div className="absolute inset-0 flex min-w-[30vw] flex-col">
            <div className="grid grid-cols-[1fr_auto] border-b p-4">
              <ArtifactTitle className="truncate overflow-hidden" />
              <button
                onClick={closeArtifact}
                className="cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>
            <ArtifactContent className="relative flex-grow" />
          </div>
        </div>
      </div>
    </div>
  );
}
