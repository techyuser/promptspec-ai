export type DomainOption = "auto" | "support" | "sql" | "triage" | "security";
export type OutputMode = "json" | "markdown" | "tool_agent";

export interface GuardrailFlags {
  antiInjection: boolean;
  piiRedaction: boolean;
  strictAbstain: boolean;
}

export interface CompileRequest {
  prompt: string;
  domain: DomainOption;
  outputMode: OutputMode;
  guardrails: GuardrailFlags;
}

export interface AuditMetric {
  dimension: string;
  before: number;
  after: number;
  note: string;
}

export interface RedTeamProbe {
  id: string;
  category: "Injection" | "Schema Break" | "Policy Trap" | "Ambiguity";
  title: string;
  attackPayload: string;
  naiveOutput: string;
  naiveVerdict: "FAIL" | "RISKY";
  naiveReason: string;
  compiledOutput: string;
  compiledVerdict: "PASS";
  compiledReason: string;
}

export interface SpecChangeNote {
  section: string;
  addedRule: string;
  reason: string;
}

export interface CompileResult {
  engine: "gemini-3.5-flash-lite" | "deterministic-fallback";
  detectedDomain: string;
  latencyMs: number;
  scores: {
    clarityBefore: number;
    clarityAfter: number;
    defenseRate: number;
    schemaAdherence: number;
  };
  vulnerabilities: string[];
  compiledSystemPrompt: string;
  jsonSchema: string;
  specChanges: SpecChangeNote[];
  auditMetrics: AuditMetric[];
  redTeamProbes: RedTeamProbe[];
}

export interface ProbeRequest {
  naivePrompt: string;
  compiledSystemPrompt: string;
  jsonSchema: string;
  attackInput: string;
  guardrails: GuardrailFlags;
}

export interface ProbeResult {
  engine: "gemini-3.5-flash-lite" | "deterministic-fallback";
  latencyMs: number;
  naiveOutput: string;
  naiveVerdict: "FAIL" | "RISKY" | "PASS";
  naiveReason: string;
  compiledOutput: string;
  compiledVerdict: "PASS" | "BLOCKED";
  compiledReason: string;
}

export interface JudgeScenario {
  id: string;
  label: string;
  badge: string;
  domain: DomainOption;
  outputMode: OutputMode;
  guardrails: GuardrailFlags;
  prompt: string;
  sampleAttack: string;
}
