/** Frozen API contract types — field names must match the backend exactly. */

export interface Resources {
  teams: number;
  vehicles: number;
  budget: number;
}

export interface Constraints {
  deadline_min: number;
}

export interface Priorities {
  speed: number;
  cost: number;
  coverage: number;
}

export interface SimulateRequest {
  name: string | null;
  incident_type?: IncidentType;
  resources: Resources;
  constraints: Constraints;
  priorities: Priorities;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type ConstraintStatus = "PASS" | "FAIL";

export interface SimulationResult {
  response_time_min: number;
  cost: number;
  coverage_pct: number;
  resource_utilization_pct: number;
  demand_covered: number;
  risk: RiskLevel;
}

export interface ConstraintViolation {
  name: string;
  limit: number;
  actual: number;
  message: string;
}

export interface ConstraintCheck {
  status: ConstraintStatus;
  violations: ConstraintViolation[];
}

export interface ScoreBreakdown {
  score: number;
  /** Backend types this as a generic object; keys are not frozen. */
  components: Record<string, unknown>;
}

export interface SimulateResponse {
  scenario_id: string;
  result: SimulationResult;
  constraint_check: ConstraintCheck;
  score_breakdown: ScoreBreakdown;
  explanation: string[];
  persisted: boolean;
}

/** Outcome shape returned by generate/compare, keyed by the originating scenario. */
export interface ScenarioOutcome {
  scenario_id: string;
  scenario: SimulateRequest;
  result: SimulationResult;
  constraint_check: ConstraintCheck;
  score_breakdown: ScoreBreakdown;
  explanation: string[];
  /** Present only when the endpoint attempted to persist this outcome. */
  persisted?: boolean;
}

export type IncidentType =
  | "emergency_response"
  | "delivery_fleet_capacity_planning"
  | "earthquake_response"
  | "tsunami_evacuation"
  | "wildfire_containment"
  | "industrial_accident";

export interface GenerateRequest {
  base_scenario: SimulateRequest;
  count: number;
  strategy: string | null;
}

export interface GenerateResponse {
  outcomes: ScenarioOutcome[];
}

export interface ScenarioSummary {
  scenario_id: string;
  name: string | null;
  created_at: string;
  score: number;
  constraint_status: ConstraintStatus;
}

export interface CompareByIdsRequest {
  scenario_ids: string[];
}

export interface CompareByScenariosRequest {
  scenarios: SimulateRequest[];
}

export type CompareRequest = CompareByIdsRequest | CompareByScenariosRequest;

export interface RankingEntry {
  scenario_id: string;
  rank: number;
  score: number;
  constraint_status: ConstraintStatus;
}

export interface Recommendation {
  feasible: boolean;
  recommended_scenario_id: string | null;
  reasoning: string[];
}

export interface TradeOff {
  scenario_id: string;
  response_time_min: number;
  cost: number;
  coverage_pct: number;
  score: number;
}

export interface CompareResponse {
  outcomes: ScenarioOutcome[];
  ranking: RankingEntry[];
  recommendation: Recommendation;
  trade_offs: TradeOff[];
}

export type RecommendRequest = CompareRequest;
export type RecommendResponse = Recommendation;
