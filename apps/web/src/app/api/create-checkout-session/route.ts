import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Payments are disabled" },
    { status: 410 },
  );
}
