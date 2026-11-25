import { NextResponse } from "next/server";
import { hasServerGeminiKey } from "@/lib/gemini-compiler";

export async function GET() {
  return NextResponse.json({
    ok: true,
    serverGeminiConfigured: hasServerGeminiKey(),
    model: "gemini-3.5-flash-lite",
  });
}
