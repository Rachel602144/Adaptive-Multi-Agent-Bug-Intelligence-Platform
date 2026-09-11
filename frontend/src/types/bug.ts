// Mirrors contracts/state.py + contracts/samples/*.json. Keep in sync with those files.

export type Severity = "Critical" | "High" | "Medium" | "Low";
export type Priority = "P1" | "P2" | "P3" | "P4";
export type Mode = "adaptive" | "static";

export type AgentName =
  | "supervisor"
  | "bug_analysis"
  | "duplicate"
  | "severity"
  | "assignment"
  | "engineering_decision";

export type AgentStatus = "ran" | "skipped" | "failed";

export interface ExecutionTraceEntry {
  agent: AgentName;
  status: AgentStatus;
  ms: number;
  llm_calls: number;
  tokens: number;
  source: string;
  model?: string | null;
}

export interface AnalysisResult {
  category: string;
  module: string;
  nature: string;
  possible_cause: string;
  technical_info: string;
  source: string;
}

export interface DuplicateMatch {
  id: string;
  source: string;
  title: string;
  score: number;
}

export interface DuplicateResult {
  is_duplicate: boolean;
  possible_duplicate: boolean;
  match_id: string | null;
  match_source: string | null;
  match_title: string | null;
  match_severity: string | null;
  match_module: string | null;
  match_team: string | null;
  score: number;
  top_matches: DuplicateMatch[];
}

export interface SeverityResult {
  label: Severity;
  confidence: number;
  probabilities: Record<Severity, number>;
  source: string;
}

export interface AssignmentResult {
  team: string;
  rule: string;
  matched_on: string;
}

export interface DecisionResult {
  severity: Severity;
  severity_source: string;
  team: string;
  team_source: string;
  priority: Priority;
  core_module_bump: boolean;
  recommended_action: string;
  target_release: string;
  estimated_resolution: string;
  possible_cause: string;
  is_duplicate: boolean;
  duplicate_of: string | null;
  explanation: string;
  explanation_source: string;
}

export interface Metrics {
  total_ms: number;
  llm_calls: number;
  tokens: number;
  agents_run: number;
}

// Full state — returned by GET /api/bugs/{id} and POST /api/bugs.
// bug_id is null for /api/compare runs, which aren't persisted as real bugs.
export interface BugState {
  bug_id: number | null;
  title: string;
  description: string;
  stack_trace: string | null;
  environment: string | null;
  mode: Mode;

  selected_agents: string[];
  supervisor_reason: string;
  short_circuit: boolean;

  analysis: AnalysisResult | null;
  duplicate: DuplicateResult | null;
  severity: SeverityResult | null;
  assignment: AssignmentResult | null;
  decision: DecisionResult | null;

  execution_trace: ExecutionTraceEntry[];
  errors: string[];
  metrics: Metrics;
}

// Slim row — returned by GET /api/bugs (list)
export interface BugSummary {
  bug_id: number;
  title: string;
  status: string;
  mode: Mode;
  created_at: string | null;
  severity: Severity | null;
  priority: Priority | null;
  team: string | null;
  category: string | null;
  module: string | null;
  is_duplicate: boolean;
  duplicate_of: string | null;
  agents_run: string[];
  agents_run_count: number;
  total_ms: number | null;
  llm_calls: number;
  tokens: number;
  short_circuit: boolean;
}

export interface BugInput {
  title: string;
  description: string;
  stack_trace?: string;
  environment?: string;
  mode?: Mode;
}

export interface AgentUsage {
  ran: number;
  skipped: number;
  failed: number;
  avg_ms: number;
}

export interface ModeEfficiency {
  runs: number;
  avg_agents_run: number;
  avg_total_ms: number;
  avg_llm_calls: number;
  avg_tokens: number;
}

export interface ComparisonAggregate {
  count: number;
  avg_agents_saved: number;
  avg_time_saved_ms: number;
  avg_llm_calls_saved: number;
  avg_tokens_saved: number;
  same_priority_rate: number;
  same_severity_rate: number;
  same_team_rate: number;
}

export interface StatsResponse {
  total: number;
  triaged: number;
  historical_bugs: number;
  critical: number;
  high: number;
  duplicates: number;
  by_severity: Record<string, number>;
  by_priority: Record<string, number>;
  by_category: Record<string, number>;
  by_team: Record<string, number>;
  by_module: Record<string, number>;
  agent_usage: Record<string, AgentUsage>;
  avg_total_ms: number;
  avg_llm_calls: number;
  by_mode: Record<Mode, ModeEfficiency>;
  comparisons: ComparisonAggregate;
}

export interface CompareSummary {
  agents_saved: number;
  time_saved_ms: number;
  llm_calls_saved: number;
  tokens_saved: number;
  same_priority: boolean;
  same_severity: boolean;
  same_team: boolean;
  adaptive_path: string[];
}

export interface CompareResponse {
  comparison_id: number;
  adaptive: BugState;
  static: BugState;
  summary: CompareSummary;
}

export interface TeamsResponse {
  teams: Record<string, string>;
  modules: Record<string, { team: string; keywords: string[] }>;
}

export interface HealthResponse {
  ok: boolean;
  llm: boolean;
  gemini: {
    keys: number;
    models: string[];
    combos: number;
    exhausted: number;
    current_model: string | null;
    openrouter_models: string[];
    openrouter_exhausted: number;
  };
  mode: Mode;
}
