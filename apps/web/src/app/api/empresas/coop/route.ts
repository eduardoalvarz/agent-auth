import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  // Create Supabase server client using request cookies
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return new NextResponse("Missing Supabase configuration", { status: 500 });
  }

  let pendingCookies: Array<{ name: string; value: string; options?: any }> = [];
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

  // Enforce RLS-based access to 'coop'
  const { data: rows, error } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", "coop")
    .limit(1);

  if (error || !rows || rows.length === 0) {
    const res = new NextResponse(
      JSON.stringify({ error: "forbidden", message: "No autorizado para acceder a COOP" }),
      { status: 403, headers: { "content-type": "application/json" } },
    );
    pendingCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    return res;
  }

  try {
    const candidates = [
      ["..", "agents", "src", "rag", "coop.md"],
      ["..", "agents", "src", "RAG", "COOP.md"],
    ];

    let content: string | null = null;
    for (const parts of candidates) {
      const filePath = path.resolve(process.cwd(), ...parts);
      try {
        content = await fs.readFile(filePath, "utf8");
        break;
      } catch {
        // continue searching next candidate path
        continue;
      }
    }

    if (content == null) {
      const res = new NextResponse("No se pudo cargar el contenido de COOP.", { status: 404 });
      pendingCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      return res;
    }
    const res = new NextResponse(content, {
      status: 200,
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "cache-control": "no-store",
      },
    });
    pendingCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    return res;
  } catch {
    const res = new NextResponse("No se pudo cargar el contenido de COOP.", { status: 404 });
    pendingCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    return res;
  }
}
