import { NextRequest, NextResponse } from "next/server";

// This API route now only redirects to the client-side callback page.
// We perform the PKCE code exchange in the browser at /auth/callback
// so that the code_verifier stored by the Supabase client is available.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const search = url.search || ""; // preserve querystring (code, redirect, etc.)
  const dest = new URL(`/auth/callback${search}`, url.origin);
  return NextResponse.redirect(dest);
}
