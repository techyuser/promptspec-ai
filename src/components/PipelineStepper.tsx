"use client";

import { CheckCircle2, Loader2, ShieldAlert, Sparkles, Swords, TerminalSquare } from "lucide-react";

interface PipelineStepperProps {
  activeStage: number; // 0 idle, 1..4 running, 5 complete
  isCompiling: boolean;
}

const STAGES = [
  { id: 1, title: "Ambiguity Scan", desc: "Leak & drift audit", icon: ShieldAlert },
  { id: 2, title: "Red-Team Suite", desc: "3 adversarial probes", icon: Swords },
  { id: 3, title: "Spec Compiler", desc: "Guardrails + schema", icon: Sparkles },
  { id: 4, title: "A/B Benchmark", desc: "Naive vs Hardened", icon: TerminalSquare },
];

export function PipelineStepper({ activeStage, isCompiling }: PipelineStepperProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {STAGES.map((stage) => {
        const Icon = stage.icon;
        const done = activeStage > stage.id || (!isCompiling && activeStage >= 5);
        const running = isCompiling && activeStage === stage.id;

        return (
          <div
            key={stage.id}
            className={`rounded-xl px-3.5 py-2.5 border transition-all duration-300 flex items-center gap-3 ${
              running
                ? "bg-violet-500/15 border-violet-400/50 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                : done
                ? "bg-emerald-500/10 border-emerald-400/30"
                : "bg-white/[0.03] border-white/10"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                running
                  ? "bg-violet-500/25 text-violet-300"
                  : done
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-white/5 text-zinc-400"
              }`}
            >
              {running ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : done ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-100 truncate">
                {stage.id}. {stage.title}
              </p>
              <p className="text-[11px] text-zinc-400 truncate">{stage.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
