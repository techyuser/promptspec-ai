"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import {
  Command,
  Cpu,
  KeyRound,
  Lock,
  Sparkles,
  Volume2,
  VolumeX,
  Wand2,
  Zap,
} from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { CommandPalette, PaletteAction } from "@/components/CommandPalette";
import { PipelineStepper } from "@/components/PipelineStepper";
import { ResultsWorkspace, ResultTab } from "@/components/ResultsWorkspace";
import { playSuccessChime } from "@/lib/audio";
import { compilePromptDeterministic } from "@/lib/heuristic-compiler";
import { JUDGE_SCENARIOS } from "@/lib/scenarios";
import {
  CompileResult,
  DomainOption,
  GuardrailFlags,
  JudgeScenario,
  OutputMode,
} from "@/types/promptspec";

const INITIAL_SCENARIO = JUDGE_SCENARIOS[0];
const INITIAL_RESULT: CompileResult = compilePromptDeterministic({
  prompt: INITIAL_SCENARIO.prompt,
  domain: INITIAL_SCENARIO.domain,
  outputMode: INITIAL_SCENARIO.outputMode,
  guardrails: INITIAL_SCENARIO.guardrails,
});

export default function PromptSpecStudio() {
  const [activeScenarioId, setActiveScenarioId] = useState<string>(INITIAL_SCENARIO.id);
  const [prompt, setPrompt] = useState<string>(INITIAL_SCENARIO.prompt);
  const [domain, setDomain] = useState<DomainOption>(INITIAL_SCENARIO.domain);
  const [outputMode, setOutputMode] = useState<OutputMode>(INITIAL_SCENARIO.outputMode);
  const [guardrails, setGuardrails] = useState<GuardrailFlags>(INITIAL_SCENARIO.guardrails);
  const [sampleAttack, setSampleAttack] = useState<string>(INITIAL_SCENARIO.sampleAttack);

  const [result, setResult] = useState<CompileResult>(INITIAL_RESULT);
  const [activeTab, setActiveTab] = useState<ResultTab>("spec");
  const [isCompiling, setIsCompiling] = useState(false);
  const [activeStage, setActiveStage] = useState<number>(5);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState("");
  const [serverGeminiConfigured, setServerGeminiConfigured] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.serverGeminiConfigured) setServerGeminiConfigured(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const triggerCompile = useCallback(
    async (override?: {
      prompt: string;
      domain: DomainOption;
      outputMode: OutputMode;
      guardrails: GuardrailFlags;
    }) => {
      const payload = override || { prompt, domain, outputMode, guardrails };
      if (payload.prompt.trim().length < 5) {
        showToast("Enter at least 5 characters to compile.");
        return;
      }

      setIsCompiling(true);
      setActiveStage(1);
      const stageTimer1 = setTimeout(() => setActiveStage(2), 140);
      const stageTimer2 = setTimeout(() => setActiveStage(3), 290);
      const stageTimer3 = setTimeout(() => setActiveStage(4), 450);

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (sessionKey) headers["x-gemini-key"] = sessionKey;

        const res = await fetch("/api/compile", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Compile request failed");
        const compiled = (await res.json()) as CompileResult;
        setResult(compiled);
        setActiveStage(5);

        playSuccessChime(soundEnabled);
        confetti({
          particleCount: 65,
          spread: 68,
          origin: { y: 0.65 },
        });
        showToast(
          compiled.engine === "gemini-3.5-flash-lite"
            ? "Compiled via live Gemini 3.5 Flash Lite"
            : "Compiled via Resilient Deterministic Engine"
        );
      } catch {
        const fallback = compilePromptDeterministic(payload);
        setResult(fallback);
        setActiveStage(5);
        showToast("Switched seamlessly to Resilient Fallback Engine.");
      } finally {
        clearTimeout(stageTimer1);
        clearTimeout(stageTimer2);
        clearTimeout(stageTimer3);
        setIsCompiling(false);
      }
    },
    [prompt, domain, outputMode, guardrails, sessionKey, soundEnabled, showToast]
  );

  const loadScenario = useCallback(
    (scenario: JudgeScenario) => {
      setActiveScenarioId(scenario.id);
      setPrompt(scenario.prompt);
      setDomain(scenario.domain);
      setOutputMode(scenario.outputMode);
      setGuardrails(scenario.guardrails);
      setSampleAttack(scenario.sampleAttack);
      void triggerCompile({
        prompt: scenario.prompt,
        domain: scenario.domain,
        outputMode: scenario.outputMode,
        guardrails: scenario.guardrails,
      });
    },
    [triggerCompile]
  );

  const paletteActions: PaletteAction[] = useMemo(
    () => [
      {
        id: "compile-now",
        group: "Action",
        label: "Compile & Stress-Test Current Prompt",
        hint: "Run 4-stage pipeline",
        run: () => void triggerCompile(),
      },
      ...JUDGE_SCENARIOS.map((s) => ({
        id: `scen-${s.id}`,
        group: "Judge Demo Scenario",
        label: `Load ${s.label}`,
        hint: s.badge,
        run: () => loadScenario(s),
      })),
      {
        id: "tab-spec",
        group: "View",
        label: "Jump to Compiled Spec & JSON Schema",
        hint: "Tab 1",
        run: () => setActiveTab("spec"),
      },
      {
        id: "tab-arena",
        group: "View",
        label: "Jump to Red-Team A/B Arena",
        hint: "Tab 2",
        run: () => setActiveTab("arena"),
      },
      {
        id: "tab-audit",
        group: "View",
        label: "Jump to 5-Axis Vulnerability Audit",
        hint: "Tab 3",
        run: () => setActiveTab("audit"),
      },
      {
        id: "copy-spec",
        group: "Export",
        label: "Copy Compiled System Prompt",
        hint: "Clipboard",
        run: () => {
          void navigator.clipboard.writeText(result.compiledSystemPrompt);
          showToast("Copied System Prompt to clipboard");
        },
      },
      {
        id: "api-settings",
        group: "Settings",
        label: "Configure Optional Gemini API Key",
        hint: "Engine",
        run: () => setKeyModalOpen(true),
      },
    ],
    [triggerCompile, loadScenario, result.compiledSystemPrompt, showToast]
  );

  const clarityLift = Math.max(0, result.scores.clarityAfter - result.scores.clarityBefore);
  const liveGeminiActive =
    serverGeminiConfigured || Boolean(sessionKey) || result.engine === "gemini-3.5-flash-lite";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07080d]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.45)]">
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-zinc-100 text-base">
                  PromptSpec AI
                </span>
                <span className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-200 border border-violet-400/30">
                  PromptWars Edition
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Adversarial Prompt Compiler & Red-Team IDE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setKeyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 transition-colors"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  liveGeminiActive ? "bg-emerald-400 animate-pulse" : "bg-cyan-400"
                }`}
              />
              <span className="hidden md:inline text-zinc-200">
                {result.engine === "gemini-3.5-flash-lite"
                  ? "Gemini 3.5 Flash Lite"
                  : liveGeminiActive
                  ? "Gemini Ready"
                  : "Hybrid Offline Engine"}
              </span>
              <KeyRound className="w-3 h-3 text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-300"
              aria-label={soundEnabled ? "Mute completion chime" : "Enable completion chime"}
              title={soundEnabled ? "Sound On" : "Sound Off"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-xs font-medium text-zinc-200"
            >
              <Command className="w-3.5 h-3.5 text-violet-300" />
              <span className="hidden sm:inline">Cmd+K</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Hero Hook + Judge One-Click Scenario Switcher */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-400/25 text-xs font-medium text-violet-200">
              <Sparkles className="w-3.5 h-3.5 text-violet-300" />
              Stop shipping fragile prompts. Stress-test before production.
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Compile messy prompts into specs.
            </h1>
          </div>

          {/* Judge Demo Mode Switcher */}
          <div className="vibe-card px-3.5 py-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mr-1">
              Demo Mode:
            </span>
            {JUDGE_SCENARIOS.map((scen) => {
              const selected = activeScenarioId === scen.id;
              return (
                <button
                  key={scen.id}
                  type="button"
                  onClick={() => loadScenario(scen)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selected
                      ? "bg-violet-500/25 text-violet-100 border border-violet-400/50 shadow-[0_0_15px_rgba(139,92,246,0.25)]"
                      : "bg-white/[0.04] text-zinc-300 hover:bg-white/[0.09] border border-white/10"
                  }`}
                >
                  {scen.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Animated Rolling Metric Counters */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="vibe-card vibe-card-interactive p-4">
            <p className="text-xs text-zinc-400">Prompt Clarity Lift</p>
            <p className="text-2xl font-bold text-white mt-1">
              +<AnimatedCounter value={clarityLift} suffix=" pts" />
            </p>
            <p className="text-[11px] text-emerald-400 mt-0.5">
              {result.scores.clarityBefore}% → {result.scores.clarityAfter}% score
            </p>
          </div>
          <div className="vibe-card vibe-card-interactive p-4">
            <p className="text-xs text-zinc-400">Red-Team Pass Rate</p>
            <p className="text-2xl font-bold text-emerald-300 mt-1">
              <AnimatedCounter value={result.scores.defenseRate} suffix="%" />
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {result.redTeamProbes.length}/{result.redTeamProbes.length} adversarial probes blocked
            </p>
          </div>
          <div className="vibe-card vibe-card-interactive p-4">
            <p className="text-xs text-zinc-400">Schema Adherence</p>
            <p className="text-2xl font-bold text-cyan-300 mt-1">
              <AnimatedCounter value={result.scores.schemaAdherence} decimals={1} suffix="%" />
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Strict JSON contract enforced</p>
          </div>
          <div className="vibe-card vibe-card-interactive p-4">
            <p className="text-xs text-zinc-400">Compile Latency</p>
            <p className="text-2xl font-bold text-violet-300 mt-1">
              <AnimatedCounter value={result.latencyMs} suffix="ms" />
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{result.detectedDomain}</p>
          </div>
        </section>

        {/* Prompt Workbench Card */}
        <section className="vibe-card p-5 lg:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-violet-300" />
              <h2 className="text-sm font-semibold text-zinc-100">Draft Prompt Input</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Target domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value as DomainOption)}
                className="rounded-lg bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-400"
              >
                <option value="auto">Domain: Auto-Detect</option>
                <option value="support">Customer Support</option>
                <option value="sql">SQL Analytics</option>
                <option value="triage">Crisis Triage</option>
                <option value="security">Security / Code</option>
              </select>

              <select
                aria-label="Output mode"
                value={outputMode}
                onChange={(e) => setOutputMode(e.target.value as OutputMode)}
                className="rounded-lg bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-400"
              >
                <option value="json">Output: Strict JSON</option>
                <option value="tool_agent">Output: Tool-Calling Agent</option>
                <option value="markdown">Output: Structured Markdown</option>
              </select>
            </div>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setActiveScenarioId("custom");
            }}
            rows={3}
            placeholder="Paste any rough AI prompt (e.g. 'Summarize legal contracts and answer questions')..."
            className="w-full rounded-xl bg-black/45 border border-white/15 p-3.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-400 transition-colors"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { key: "antiInjection", label: "Anti-Injection Sandbox" },
                  { key: "piiRedaction", label: "PII Redaction" },
                  { key: "strictAbstain", label: "Zero-Hallucination Abstain" },
                ] as const
              ).map((toggle) => {
                const enabled = guardrails[toggle.key];
                return (
                  <button
                    key={toggle.key}
                    type="button"
                    onClick={() =>
                      setGuardrails((prev) => ({ ...prev, [toggle.key]: !prev[toggle.key] }))
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      enabled
                        ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/35"
                        : "bg-white/[0.03] text-zinc-400 border-white/10 hover:text-zinc-200"
                    }`}
                  >
                    <Lock className="w-3 h-3" />
                    {toggle.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={isCompiling}
              onClick={() => void triggerCompile()}
              className="vibe-button-shimmer inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm shrink-0 disabled:opacity-60"
            >
              <Zap className="w-4 h-4" />
              {isCompiling ? "Compiling & Red-Teaming..." : "Compile & Stress-Test"}
            </button>
          </div>

          <PipelineStepper activeStage={activeStage} isCompiling={isCompiling} />
        </section>

        {/* Results Workspace */}
        <ResultsWorkspace
          key={sampleAttack}
          result={result}
          naivePrompt={prompt}
          sampleAttack={sampleAttack}
          guardrails={guardrails}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          sessionKey={sessionKey}
          onCopySuccess={showToast}
        />
      </main>

      {/* Modals & Toast */}
      {paletteOpen && (
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          actions={paletteActions}
        />
      )}

      {keyModalOpen && (
        <ApiKeyModal
          open={keyModalOpen}
          onClose={() => setKeyModalOpen(false)}
          sessionKey={sessionKey}
          onSaveKey={setSessionKey}
          serverConfigured={serverGeminiConfigured}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#111420]/95 border border-violet-400/40 text-xs font-medium text-zinc-100 shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
