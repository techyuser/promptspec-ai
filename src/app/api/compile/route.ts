import { NextRequest, NextResponse } from "next/server";
import { compilePromptWithGemini } from "@/lib/gemini-compiler";
import { CompileRequest } from "@/types/promptspec";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<CompileRequest>;
    if (!body.prompt || typeof body.prompt !== "string" || body.prompt.trim().length < 5) {
      return NextResponse.json(
        { error: "Please enter a prompt of at least 5 characters." },
        { status: 400 }
      );
    }

    const sanitized: CompileRequest = {
      prompt: body.prompt.slice(0, 3000),
      domain: body.domain || "auto",
      outputMode: body.outputMode || "json",
      guardrails: {
        antiInjection: body.guardrails?.antiInjection ?? true,
        piiRedaction: body.guardrails?.piiRedaction ?? true,
        strictAbstain: body.guardrails?.strictAbstain ?? true,
      },
    };

    const overrideKey = req.headers.get("x-gemini-key");
    const result = await compilePromptWithGemini(sanitized, overrideKey);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to compile prompt specification." }, { status: 500 });
  }
}
