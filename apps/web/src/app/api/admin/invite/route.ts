import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/auth/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : undefined;

    const configured = process.env.ADMIN_INVITE_TOKEN;
    if (!configured) {
      return NextResponse.json(
        { error: "Server not configured for invites" },
        { status: 500 },
      );
    }

    if (!token || token !== configured) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Invalid payload: 'email' is required" },
        { status: 400 },
      );
    }

    const redirectTo = new URL("/auth/set-password", request.nextUrl.origin).toString();

    // Create Supabase server client on-demand to avoid build-time env checks
    const supabaseServer = getSupabaseServerClient();

    const { data, error } = await supabaseServer.auth.admin.inviteUserByEmail(
      email,
      { redirectTo },
    );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 500 },
      );
    }

    return NextResponse.json({ success: true, user: data.user }, { status: 200 });
  } catch (err: any) {
    console.error("Invite API error", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}

