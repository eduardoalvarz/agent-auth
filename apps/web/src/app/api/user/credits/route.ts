import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Credits are disabled" },
    { status: 410 },
  );
}
