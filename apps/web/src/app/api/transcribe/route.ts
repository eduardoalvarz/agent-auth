import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearerFromAuthHeader(req: NextRequest): string | undefined {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return undefined;
  const prefix = "Bearer ";
  return authHeader.startsWith(prefix) ? authHeader.slice(prefix.length) : undefined;
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
  }
  if (!openaiKey) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY server env" }, { status: 500 });
  }

  // Verify authentication either via Authorization bearer token (preferred) or cookies (middleware path)
  let userId: string | null = null;
  let pendingCookies: Array<{ name: string; value: string; options?: any }> = [];

  const finalize = (body: any, init?: ResponseInit) => {
    const res = NextResponse.json(body, init);
    if (pendingCookies.length) {
      pendingCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    }
    return res;
  };

  const bearer = bearerFromAuthHeader(req) || req.headers.get("x-supabase-access-token") || undefined;
  if (bearer) {
    // Validate token explicitly
    const supabaseHeader = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabaseHeader.auth.getUser(bearer);
    if (error || !data?.user) {
      return finalize({ error: "Unauthorized" }, { status: 401 });
    }
    userId = data.user.id;
  } else {
    // Fallback to cookie-based validation (should be enforced by middleware as well)
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies = cookiesToSet;
        },
      },
    });

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return finalize({ error: "Unauthorized" }, { status: 401 });
    }
    userId = data.user.id;
  }

  // Validate multipart/form-data
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return finalize({ error: "Content-Type must be multipart/form-data" }, { status: 415 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    if (audio && typeof (audio as any).arrayBuffer === "function") {
      file = audio as File; // In Next.js on Node runtime this will be a web File
    }
  } catch (e) {
    return finalize({ error: "Invalid form data" }, { status: 400 });
  }

  if (!file) {
    return finalize({ error: "Missing 'audio' file field" }, { status: 400 });
  }

  if (file.size <= 0) {
    return finalize({ error: "Empty audio file" }, { status: 400 });
  }

  // Basic size guard (OpenAI whisper limit is large, keep a sane limit here)
  const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
  if (file.size > MAX_SIZE_BYTES) {
    return finalize({ error: "Audio file too large (max 25MB)" }, { status: 413 });
  }

  // Forward to OpenAI Whisper
  try {
    const openaiForm = new FormData();
    openaiForm.append("model", "whisper-1");
    // Keep original filename if provided, fallback to generic
    openaiForm.append("file", file, file.name || "audio.webm");
    openaiForm.append("response_format", "json");
    openaiForm.append("temperature", "0");

    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
      },
      body: openaiForm,
    });

    if (!r.ok) {
      let details: any = undefined;
      try {
        details = await r.json();
      } catch {
        // ignore
      }
      const msg = details?.error?.message || `OpenAI error ${r.status}`;
      return finalize({ error: msg, details }, { status: 502 });
    }

    const json = (await r.json()) as { text?: string };
    const text = (json?.text || "").toString();

    return finalize({ text, userId });
  } catch (e: any) {
    return finalize(
      { error: "Transcription failed", message: e?.message || String(e) },
      { status: 500 },
    );
  }
}
