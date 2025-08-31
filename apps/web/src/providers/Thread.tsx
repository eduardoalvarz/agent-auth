import { validate } from "uuid";

import { Thread } from "@langchain/langgraph-sdk";
import { useQueryState } from "nuqs";
import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import { createClient } from "./client";
import { useAuthContext } from "@/providers/Auth";
import { getSupabaseClient } from "@/lib/auth/supabase-client";

interface ThreadContextType {
  getThreads: () => Promise<Thread[]>;
  threads: Thread[];
  setThreads: Dispatch<SetStateAction<Thread[]>>;
  threadsLoading: boolean;
  setThreadsLoading: Dispatch<SetStateAction<boolean>>;
}

const ThreadContext = createContext<ThreadContextType | undefined>(undefined);

function getThreadSearchMetadata(
  assistantId: string,
): { graph_id: string } | { assistant_id: string } {
  if (validate(assistantId)) {
    return { assistant_id: assistantId };
  } else {
    return { graph_id: assistantId };
  }
}

export function ThreadProvider({ children }: { children: ReactNode }) {
  // Use same defaults as StreamProvider to keep behavior consistent
  const DEFAULT_API_URL =
  "https://about-chat-efae22149131518cae4094f2526134ad.us.langgraph.app";
  const DEFAULT_ASSISTANT_ID = "aboutchat";
  const isProd = process.env.NODE_ENV === "production";

  // Get environment variables
  const envApiUrl: string | undefined = process.env.NEXT_PUBLIC_API_URL;
  const envAssistantId: string | undefined =
    process.env.NEXT_PUBLIC_ASSISTANT_ID;

  // Use URL params with env var fallbacks
  const [apiUrl] = useQueryState("apiUrl", {
    defaultValue: envApiUrl || "",
  });
  const [assistantId] = useQueryState("assistantId", {
    defaultValue: envAssistantId || "",
  });

  // Determine final values to use
  // - In production: do NOT rely on URL params; use env vars or safe defaults.
  // - In development: allow URL params to override env vars.
  const finalApiUrl = isProd
    ? (envApiUrl || "/api")
    : (apiUrl || envApiUrl || DEFAULT_API_URL);
  const finalAssistantId = isProd
    ? (envAssistantId || DEFAULT_ASSISTANT_ID)
    : (assistantId || envAssistantId);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const { session } = useAuthContext();

  const getThreads = useCallback(async (): Promise<Thread[]> => {
    if (!finalApiUrl || !finalAssistantId) return [];
    // Ensure we use a fresh JWT (refresh if expiring soon)
    const supabase = getSupabaseClient();
    let jwt = session?.accessToken || undefined;
    try {
      const {
        data: { session: sbSession },
      } = await supabase.auth.getSession();
      const nowSec = Math.floor(Date.now() / 1000);
      const exp = (sbSession as any)?.expires_at ?? 0;
      if (exp && exp - nowSec < 30) {
        await supabase.auth.refreshSession();
      }
      const {
        data: { session: refreshed },
      } = await supabase.auth.getSession();
      jwt = (refreshed as any)?.access_token ?? jwt;
    } catch (e) {
      console.warn("[ThreadProvider] ensure fresh JWT failed", e);
    }

    console.log(
      "[ThreadProvider] getThreads: apiUrl=",
      finalApiUrl,
      "assistantId=",
      finalAssistantId,
      "jwt=",
      jwt ? "present" : "missing",
    );

    const client = createClient(finalApiUrl, jwt);
    console.log("[ThreadProvider] Created client", client);

    const search = async () =>
      client.threads.search({
        metadata: {
          ...getThreadSearchMetadata(finalAssistantId),
        },
        limit: 100,
      });

    try {
      const threads = await search();
      console.log("[ThreadProvider] threads result", threads);
      return threads;
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const msg = String(err?.message ?? "");
      const looks401 = status === 401 || /401|invalid jwt|expired/i.test(msg);
      if (!looks401) throw err;

      console.warn(
        "[ThreadProvider] 401 detected, attempting token refresh & retry",
      );
      try {
        await supabase.auth.refreshSession();
        const {
          data: { session: again },
        } = await supabase.auth.getSession();
        const newJwt = (again as any)?.access_token ?? jwt;
        const retryClient = createClient(finalApiUrl, newJwt);
        const threads = await retryClient.threads.search({
          metadata: {
            ...getThreadSearchMetadata(finalAssistantId),
          },
          limit: 100,
        });
        console.log("[ThreadProvider] threads result (after retry)", threads);
        return threads;
      } catch (err2) {
        console.error("[ThreadProvider] retry after refresh failed", err2);
        throw err2;
      }
    }
  }, [finalApiUrl, finalAssistantId, session]);

  const value = {
    getThreads,
    threads,
    setThreads,
    threadsLoading,
    setThreadsLoading,
  };

  return (
    <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>
  );
}

export function useThreads() {
  const context = useContext(ThreadContext);
  if (context === undefined) {
    throw new Error("useThreads must be used within a ThreadProvider");
  }
  return context;
}
