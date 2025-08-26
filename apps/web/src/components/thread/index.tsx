import { v4 as uuidv4 } from "uuid";
import { ReactNode, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/providers/Stream";
import { useState, FormEvent } from "react";
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
  Wrench,
  Database,
} from "lucide-react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import ThreadHistory from "./history";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";

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
      style={{ width: "100%", height: "100%" }}
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
  const [input, setInput] = useState("");
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
    } catch {
      // no-op
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
    { company: "PINKCHELADAS", datasets: [] },
  ];

  const labelMap: Record<string, string> = {
    coop_sellout: "COOP sellout",
    coop_inventarios: "COOP inventarios",
  };
  const selectedSummary = () => {
    if (!selectedDatasets.length) return "Selecciona una base de datos";
    return selectedDatasets
      .map((id) => labelMap[id] || id)
      .join(" · ");
  };
  const chipDotColor = (id: string) => {
    if (id.startsWith("coop_")) return "bg-emerald-500";
    if (id.startsWith("demo_")) return "bg-zinc-300";
    if (id.toLowerCase().startsWith("pink")) return "bg-rose-500";
    return "bg-gray-400";
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
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
          "grid w-full grid-cols-[1fr_0fr] transition-all duration-500",
          artifactOpen && "grid-cols-[3fr_2fr]",
        )}
      >
        <motion.div
          className={cn(
            "relative flex min-w-0 flex-1 flex-col overflow-hidden",
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

          <StickToBottom className="relative flex-1 overflow-hidden">
            <StickyToBottomContent
              className={cn(
                "absolute inset-0 overflow-y-scroll px-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent",
                !chatStarted && "mt-[25vh] flex flex-col items-stretch",
                chatStarted && "grid grid-rows-[1fr_auto]",
              )}
              contentClassName="pt-8 pb-16  max-w-3xl mx-auto flex flex-col gap-4 w-full"
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
                <div className="sticky bottom-0 flex flex-col items-center bg-white">
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
                      "relative z-10 mx-auto mb-4 w-full max-w-3xl rounded-[2rem] bg-transparent transition-all",
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
                        <div className="relative flex items-center gap-2 px-2.5 py-2">
                          {/* Left: Bases trigger + chips (content-sized, capped at 1/3) */}
                          <div className="flex items-center gap-2 max-w-[33%] min-w-0 flex-grow-0 flex-shrink">
                          {/* Database trigger and selection */}
                          <DropdownMenu.Root open={datasetsMenuOpen} onOpenChange={setDatasetsMenuOpen}>
                            <DropdownMenu.Trigger asChild>
                              <button
                                type="button"
                                className="flex h-10 items-center gap-2 text-white/70 hover:text-white focus:outline-none"
                                title="Seleccionar bases de datos"
                              >
                                <Database className="size-4" />
                                <span className="hidden sm:inline text-[11px] uppercase tracking-wide leading-5">Bases</span>
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
                                {DATASET_GROUPS.map((group, gi) => (
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
                              className="min-w-0 flex flex-wrap items-center gap-1"
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
                          <textarea
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
                          placeholder="Escribe tu mensaje..."
                          rows={1}
                          className="field-sizing-content flex-1 min-h-[40px] resize-none border-none bg-transparent px-2 py-2 text-sm leading-5 text-white placeholder:text-white/60 shadow-none ring-0 outline-none focus:ring-0 focus:outline-none max-h-36 overflow-y-auto caret-white selection:bg-white/10 selection:text-inherit"
                        />
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
