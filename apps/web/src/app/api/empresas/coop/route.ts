import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
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
      } catch {}
    }

    if (content == null) {
      return new Response("No se pudo cargar el contenido de COOP.", { status: 404 });
    }
    return new Response(content, {
      status: 200,
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return new Response("No se pudo cargar el contenido de COOP.", { status: 404 });
  }
}
