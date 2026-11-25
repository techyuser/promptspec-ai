"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  FileJson2,
  Play,
  ShieldAlert,
  ShieldCheck,
  Swords,
  XCircle,
} from "lucide-react";
import { CompileResult, GuardrailFlags, ProbeResult } from "@/types/promptspec";

export type ResultTab = "spec" | "arena" | "audit";

interface ResultsWorkspaceProps {
  result: CompileResult;
  naivePrompt: string;
  sampleAttack: string;
  guardrails: GuardrailFlags;
  activeTab: ResultTab;
  onTabChange: (tab: ResultTab) => void;
  sessionKey: string;
  onCopySuccess: (label: string) => void;
}

export function ResultsWorkspace({
  result,
  naivePrompt,
  sampleAttack,
  guardrails,
  activeTab,
  onTabChange,
  sessionKey,
  onCopySuccess,
}: ResultsWorkspaceProps) {
  const [selectedProbeIdx, setSelectedProbeIdx] = useState(0);
  const [customAttack, setCustomAttack] = useState(sampleAttack);
  const [probeLoading, setProbeLoading] = useState(false);
  const [customProbeResult, setCustomProbeResult] = useState<ProbeResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const safeProbeIndex =
    selectedProbeIdx < result.redTeamProbes.length ? selectedProbeIdx : 0;
  const activeProbe = result.redTeamProbes[safeProbeIndex];

  const handleCopy = async (id: string, text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    onCopySuccess(label);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleDownloadJson = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      engine: result.engine,
      domain: result.detectedDomain,
      scores: result.scores,
      compiledSystemPrompt: result.compiledSystemPrompt,
      jsonSchema: JSON.parse(result.jsonSchema),
      redTeamProbes: result.redTeamProbes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "promptspec-bundle.json";
    a.click();
    URL.revokeObjectURL(url);
    onCopySuccess("Downloaded promptspec-bundle.json");
  };

  const handleRunCustomAttack = async () => {
    if (!customAttack.trim()) return;
    setProbeLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionKey) headers["x-gemini-key"] = sessionKey;

      const res = await fetch("/api/probe", {
        method: "POST",
        headers,
        body: JSON.stringify({
          naivePrompt,
          compiledSystemPrompt: result.compiledSystemPrompt,
          jsonSchema: result.jsonSchema,
          attackInput: customAttack,
          guardrails,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as ProbeResult;
        setCustomProbeResult(data);
      }
    } finally {
      setProbeLoading(false);
    }
  };

  const tabs: { id: ResultTab; label: string; icon: typeof Code2 }[] = [
    { id: "spec", label: "Compiled Spec & Schema", icon: Code2 },
    { id: "arena", label: "Red-Team A/B Arena", icon: Swords },
    { id: "audit", label: "Vulnerability Audit", icon: ShieldCheck },
  ];

  return (
    <section className="vibe-card p-5 lg:p-6 space-y-5">
      {/* Tab Header & Export Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-2" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? "bg-violet-500/20 text-violet-200 border border-violet-400/40 shadow-[0_0_18px_rgba(139,92,246,0.2)]"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              handleCopy("sys-top", result.compiledSystemPrompt, "Copied System Prompt")
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-200 transition-colors"
          >
            {copiedId === "sys-top" ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-violet-300" />
            )}
            Copy System Prompt
          </button>
          <button
            type="button"
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-300" />
            Export Bundle
          </button>
        </div>
      </div>

      {/* TAB 1: COMPILED SPEC & SCHEMA */}
      {activeTab === "spec" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 rounded-xl bg-black/45 border border-white/10 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
                <span className="text-xs font-semibold text-violet-200 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Hardened System Prompt ({result.detectedDomain})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy("sys-code", result.compiledSystemPrompt, "Copied System Prompt")
                  }
                  className="text-[11px] text-zinc-400 hover:text-zinc-100 flex items-center gap-1"
                >
                  {copiedId === "sys-code" ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  Copy
                </button>
              </div>
              <pre className="p-4 text-xs leading-relaxed text-zinc-200 font-mono whitespace-pre-wrap overflow-x-auto max-h-[340px]">
                {result.compiledSystemPrompt}
              </pre>
            </div>

            <div className="lg:col-span-5 rounded-xl bg-black/45 border border-white/10 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
                <span className="text-xs font-semibold text-cyan-200 flex items-center gap-2">
                  <FileJson2 className="w-3.5 h-3.5 text-cyan-400" />
                  Output JSON Schema Contract
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy("json-code", result.jsonSchema, "Copied JSON Schema")}
                  className="text-[11px] text-zinc-400 hover:text-zinc-100 flex items-center gap-1"
                >
                  {copiedId === "json-code" ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  Copy
                </button>
              </div>
              <pre className="p-4 text-xs leading-relaxed text-cyan-100/90 font-mono whitespace-pre-wrap overflow-x-auto max-h-[340px]">
                {result.jsonSchema}
              </pre>
            </div>
          </div>

          {/* Spec Architecture Changelog */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Compiler Hardening Diff — Why Each Layer Was Added
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {result.specChanges.map((item) => (
                <div
                  key={item.section}
                  className="rounded-xl p-3.5 bg-white/[0.03] border border-white/10 space-y-1.5"
                >
                  <p className="text-xs font-semibold text-violet-300">{item.section}</p>
                  <p className="text-xs text-zinc-100 font-medium">{item.addedRule}</p>
                  <p className="text-[11px] text-zinc-400">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RED-TEAM A/B ARENA */}
      {activeTab === "arena" && activeProbe && (
        <div className="space-y-5">
          {/* Probe Selector Pills */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {result.redTeamProbes.map((probe, idx) => {
              const selected = idx === safeProbeIndex;
              return (
                <button
                  key={probe.id}
                  type="button"
                  onClick={() => setSelectedProbeIdx(idx)}
                  className={`text-left rounded-xl p-3.5 border transition-all ${
                    selected
                      ? "bg-violet-500/15 border-violet-400/50"
                      : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/25">
                      {probe.category}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-300">
                      DEFENDED ✓
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-100 line-clamp-1">{probe.title}</p>
                </button>
              );
            })}
          </div>

          {/* Active Attack Payload */}
          <div className="rounded-xl p-4 bg-rose-950/20 border border-rose-500/25 space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> Adversarial Attack Input
            </span>
            <p className="text-sm font-mono text-rose-100/95">{activeProbe.attackPayload}</p>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl p-4 bg-black/45 border border-rose-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">Naive Draft Prompt</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30">
                  <XCircle className="w-3 h-3" /> {activeProbe.naiveVerdict}
                </span>
              </div>
              <pre className="p-3 rounded-lg bg-black/50 text-xs font-mono text-rose-100/85 whitespace-pre-wrap">
                {activeProbe.naiveOutput}
              </pre>
              <p className="text-xs text-rose-300/90 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {activeProbe.naiveReason}
              </p>
            </div>

            <div className="rounded-xl p-4 bg-black/45 border border-emerald-500/35 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">PromptSpec Compiled Output</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <CheckCircle2 className="w-3 h-3" /> {activeProbe.compiledVerdict}
                </span>
              </div>
              <pre className="p-3 rounded-lg bg-black/50 text-xs font-mono text-emerald-100/90 whitespace-pre-wrap overflow-x-auto">
                {activeProbe.compiledOutput}
              </pre>
              <p className="text-xs text-emerald-300/90 flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {activeProbe.compiledReason}
              </p>
            </div>
          </div>

          {/* Interactive Live Custom Attack Sandbox */}
          <div className="rounded-xl p-4 bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-zinc-200">
                Try Breaking It Yourself — Custom Adversarial Probe
              </h3>
              <span className="text-[11px] text-zinc-400">Runs A/B via /api/probe</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                value={customAttack}
                onChange={(e) => setCustomAttack(e.target.value)}
                placeholder="Enter a jailbreak, SQL injection, or edge-case prompt..."
                className="flex-1 rounded-xl bg-black/40 border border-white/15 px-3.5 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-400"
              />
              <button
                type="button"
                disabled={probeLoading || !customAttack.trim()}
                onClick={handleRunCustomAttack}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                {probeLoading ? "Probing..." : "Run Live Attack"}
              </button>
            </div>

            {customProbeResult && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2">
                <div className="rounded-lg p-3 bg-black/40 border border-rose-500/25 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-zinc-300">Naive Response</span>
                    <span className="font-bold text-rose-300">{customProbeResult.naiveVerdict}</span>
                  </div>
                  <p className="text-xs font-mono text-zinc-300 whitespace-pre-wrap">
                    {customProbeResult.naiveOutput}
                  </p>
                  <p className="text-[11px] text-rose-300/90">{customProbeResult.naiveReason}</p>
                </div>
                <div className="rounded-lg p-3 bg-black/40 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-zinc-300">Compiled Spec Response</span>
                    <span className="font-bold text-emerald-300">
                      {customProbeResult.compiledVerdict}
                    </span>
                  </div>
                  <pre className="text-xs font-mono text-emerald-100/90 whitespace-pre-wrap overflow-x-auto">
                    {customProbeResult.compiledOutput}
                  </pre>
                  <p className="text-[11px] text-emerald-300/90">
                    {customProbeResult.compiledReason}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: VULNERABILITY AUDIT */}
      {activeTab === "audit" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              5-Axis Security & Determinism Lift
            </h3>
            {result.auditMetrics.map((metric) => (
              <div
                key={metric.dimension}
                className="rounded-xl p-3.5 bg-white/[0.03] border border-white/10 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-100">{metric.dimension}</span>
                  <span className="font-mono text-zinc-300">
                    <span className="text-rose-400">{metric.before}%</span> →{" "}
                    <span className="text-emerald-400 font-bold">{metric.after}%</span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${metric.after}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-rose-400/50 rounded-full"
                    style={{ width: `${metric.before}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-400">{metric.note}</p>
              </div>
            ))}
          </div>

          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Detected Gaps In Original Draft
            </h3>
            <div className="rounded-xl p-4 bg-white/[0.03] border border-white/10 space-y-2.5">
              {result.vulnerabilities.map((vuln, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{vuln}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
