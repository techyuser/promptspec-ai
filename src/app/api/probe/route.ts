import { NextRequest, NextResponse } from "next/server";
import { runCustomProbeWithGemini } from "@/lib/gemini-compiler";
import { ProbeRequest } from "@/types/promptspec";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ProbeRequest>;
    if (!body.attackInput || !body.compiledSystemPrompt) {
      return NextResponse.json(
        { error: "Attack input and compiled spec are required." },
        { status: 400 }
      );
    }

    const sanitized: ProbeRequest = {
      naivePrompt: (body.naivePrompt || "").slice(0, 2000),
      compiledSystemPrompt: body.compiledSystemPrompt.slice(0, 3500),
      jsonSchema: (body.jsonSchema || "{}").slice(0, 1500),
      attackInput: body.attackInput.slice(0, 1200),
      guardrails: {
        antiInjection: body.guardrails?.antiInjection ?? true,
        piiRedaction: body.guardrails?.piiRedaction ?? true,
        strictAbstain: body.guardrails?.strictAbstain ?? true,
      },
    };

    const overrideKey = req.headers.get("x-gemini-key");
    const result = await runCustomProbeWithGemini(sanitized, overrideKey);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to run adversarial probe." }, { status: 500 });
  }
}
