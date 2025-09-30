import { NextRequest, NextResponse } from "next/server";

// This file acts as a proxy for requests to your LangGraph server.
// Read the [Going to Production](https://github.com/langchain-ai/agent-chat-ui?tab=readme-ov-file#going-to-production) section for more information.

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getCorsHeaders(origin?: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, X-Supabase-Access-Token, Content-Type, X-Requested-With, Accept",
  } as Record<string, string>;
}

function buildTargetUrl(req: NextRequest, baseApiUrl: string): string {
  const base = baseApiUrl.replace(/\/+$/, "");
  const path = req.nextUrl.pathname.replace(/^\/?api\//, "");
  const sp = new URLSearchParams(req.nextUrl.searchParams);
  sp.delete("_path");
  sp.delete("nxtP_path");
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  return `${base}/${path}${qs}`;
}

function forwardHeaders(req: NextRequest): Headers {
  const out = new Headers();
  const auth = req.headers.get("authorization");
  const sb = req.headers.get("x-supabase-access-token");
  const ct = req.headers.get("content-type");
  if (auth) out.set("authorization", auth);
  if (sb) out.set("x-supabase-access-token", sb);
  if (ct) out.set("content-type", ct);
  return out;
}

async function handle(req: NextRequest, method: string): Promise<NextResponse> {
  // IMPORTANT: Use a server-only base URL to avoid proxy recursion
  const apiUrl = process.env.LANGGRAPH_API_URL || process.env.NEXT_PUBLIC_LANGGRAPH_API_URL;
  // Validate absolute URL (must start with http/https
  const isAbsolute = typeof apiUrl === "string" && /^(https?:)\/\//i.test(apiUrl);
  if (!apiUrl || !isAbsolute) {
    return NextResponse.json(
      {
        error:
          "LANGGRAPH_API_URL is not configured or not absolute. Set a full https:// URL in server env.",
      },
      { status: 500 },
    );
  }
  try {
    const target = buildTargetUrl(req, apiUrl);
    const init: RequestInit = {
      method,
      headers: forwardHeaders(req),
    };
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      // Preserve raw body
      init.body = await req.text();
    }
    // Always bypass caches when proxying authenticated user traffic
    (init as any).cache = "no-store";
    const res = await fetch(target, init);
    const headers = new Headers(res.headers);
    // Ensure responses are not cached or shared across users
    headers.set("Cache-Control", "no-store");
    // Vary on auth headers to avoid CDN/proxy sharing
    const vary = headers.get("Vary");
    const neededVary = "Authorization, X-Supabase-Access-Token, Origin, Accept";
    headers.set("Vary", vary ? `${vary}, ${neededVary}` : neededVary);
    const resp = new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
    // Add CORS for browser clients
    const origin = req.headers.get("origin");
    Object.entries(getCorsHeaders(origin)).forEach(([k, v]) =>
      resp.headers.set(k, v),
    );
    return resp;
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Proxy error" },
      { status: e?.status ?? 500 },
    );
  }
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req.headers.get("origin")),
  });
}
export function GET(req: NextRequest) {
  return handle(req, "GET");
}
export function POST(req: NextRequest) {
  return handle(req, "POST");
}
export function PUT(req: NextRequest) {
  return handle(req, "PUT");
}
export function PATCH(req: NextRequest) {
  return handle(req, "PATCH");
}
export function DELETE(req: NextRequest) {
  return handle(req, "DELETE");
}

