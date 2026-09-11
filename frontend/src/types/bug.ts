// Mirrors contracts/state.py — BugState. Keep in sync with that file.

export type Severity = "Critical" | "High" | "Medium" | "Low";

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
}

export interface AnalysisResult {
  category: string;
  module: string;
  nature: string;
  possible_cause: string;
  technical_info: string;
}

export interface DuplicateResult {
  is_duplicate: boolean;
  match_id: number | null;
  match_title: string | null;
  score: number;
}

export interface SeverityResult {
  label: Severity;
  confidence: number;
}

export interface AssignmentResult {
  team: string;
  rule: string;
}

export interface DecisionResult {
  priority: "P1" | "P2" | "P3" | "P4";
  recommended_action: string;
  team: string;
  target_release: "Hotfix" | "Next" | "Backlog";
  estimated_resolution: string;
  possible_cause: string;
  explanation: string;
}

export interface BugState {
  bug_id: number;
  title: string;
  description: string;
  stack_trace: string | null;
  environment: string | null;

  selected_agents: string[];
  supervisor_reason: string;

  analysis: AnalysisResult | null;
  duplicate: DuplicateResult | null;
  severity: SeverityResult | null;
  assignment: AssignmentResult | null;
  decision: DecisionResult | null;

  execution_trace: ExecutionTraceEntry[];
  errors: string[];

  created_at?: string;
}

export interface BugInput {
  title: string;
  description: string;
  stack_trace?: string;
  environment?: string;
}

export interface StatsResponse {
  total: number;
  by_severity: Record<string, number>;
  duplicates: number;
  by_category: Record<string, number>;
  by_team: Record<string, number>;
}

export interface Team {
  name: string;
  module_count: number;
}
