import type {
  CompareRequest,
  CompareResponse,
  ConstraintCheck,
  ConstraintViolation,
  GenerateRequest,
  GenerateResponse,
  RankingEntry,
  RecommendResponse,
  ScenarioOutcome,
  ScenarioSummary,
  SimulateRequest,
  SimulateResponse,
  SimulationResult,
  TradeOff,
} from "../types/domain";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round(n: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function hashId(prefix: string, payload: string): string {
  let h = 0;
  for (let i = 0; i < payload.length; i += 1) {
    h = (h * 31 + payload.charCodeAt(i)) | 0;
  }
  return `${prefix}-${Math.abs(h).toString(16)}`;
}

function evaluate(req: SimulateRequest): {
  result: SimulationResult;
  constraint_check: ConstraintCheck;
  score_breakdown: SimulateResponse["score_breakdown"];
  explanation: string[];
} {
  const { teams, vehicles, budget } = req.resources;
  const deadline = req.constraints.deadline_min;
  const { speed, cost: costPri, coverage: covPri } = req.priorities;

  const response_time_min = round(
    clamp(88 - teams * 6.5 - vehicles * 3.2 - speed * 18, 8, 120),
  );
  const cost = Math.round(teams * 8200 + vehicles * 3600 + 14000 + (1 - costPri) * 4000);
  const coverage_pct = round(clamp(38 + teams * 7.5 + vehicles * 4.2 + covPri * 16, 12, 99));
  const resource_utilization_pct = round(clamp(35 + teams * 4 + vehicles * 3.5, 20, 98));
  const demand_covered = Math.round(clamp(coverage_pct * 12, 80, 1400));

  let risk: SimulationResult["risk"] = "LOW";
  if (response_time_min > deadline * 0.85 || coverage_pct < 55) risk = "MEDIUM";
  if (response_time_min > deadline || coverage_pct < 40 || teams < 3) risk = "HIGH";

  const violations: ConstraintViolation[] = [];
  if (response_time_min > deadline) {
    violations.push({
      name: "deadline_min",
      limit: deadline,
      actual: response_time_min,
      message: `Projected response time ${response_time_min} min exceeds deadline of ${deadline} min.`,
    });
  }
  if (cost > budget) {
    violations.push({
      name: "budget",
      limit: budget,
      actual: cost,
      message: `Estimated deployment cost ${cost} exceeds budget of ${budget}.`,
    });
  }

  const constraint_check: ConstraintCheck = {
    status: violations.length ? "FAIL" : "PASS",
    violations,
  };

  const speedComponent = round((1 - response_time_min / 120) * 100 * speed, 2);
  const costComponent = round((1 - cost / Math.max(budget, cost, 1)) * 100 * costPri, 2);
  const coverageComponent = round(coverage_pct * covPri, 2);
  const feasibilityPenalty = constraint_check.status === "FAIL" ? 35 : 0;
  const score = round(
    clamp(speedComponent + costComponent + coverageComponent - feasibilityPenalty, 0, 100),
    1,
  );

  const explanation = [
    `${teams} teams and ${vehicles} vehicles yield ~${response_time_min} min response time.`,
    `Coverage is ${coverage_pct}% of estimated incident demand (${demand_covered} units).`,
    `Cost is ${cost} against a budget of ${budget}; utilization ${resource_utilization_pct}%.`,
    constraint_check.status === "PASS"
      ? "All hard constraints are satisfied under current priorities."
      : "One or more hard constraints failed — see violations before deploying.",
  ];

  return {
    result: {
      response_time_min,
      cost,
      coverage_pct,
      resource_utilization_pct,
      demand_covered,
      risk,
    },
    constraint_check,
    score_breakdown: {
      score,
      components: {
        speed: speedComponent,
        cost: costComponent,
        coverage: coverageComponent,
        feasibility_penalty: feasibilityPenalty,
      },
    },
    explanation,
  };
}

export const PASS_FIXTURE_REQUEST: SimulateRequest = {
  name: "Coastal surge — balanced surge",
  resources: { teams: 8, vehicles: 12, budget: 180000 },
  constraints: { deadline_min: 45 },
  priorities: { speed: 0.4, cost: 0.25, coverage: 0.35 },
};

export const FAIL_FIXTURE_REQUEST: SimulateRequest = {
  name: "Urban fire cluster — under-resourced",
  resources: { teams: 2, vehicles: 3, budget: 28000 },
  constraints: { deadline_min: 18 },
  priorities: { speed: 0.7, cost: 0.1, coverage: 0.2 },
};

export function mockSimulate(req: SimulateRequest): SimulateResponse {
  const evaluated = evaluate(req);
  const scenario_id = hashId(
    "scn",
    JSON.stringify({
      name: req.name,
      resources: req.resources,
      constraints: req.constraints,
      priorities: req.priorities,
    }),
  );
  return {
    scenario_id,
    ...evaluated,
    persisted: true,
  };
}

export const PASS_FIXTURE_RESPONSE = mockSimulate(PASS_FIXTURE_REQUEST);
export const FAIL_FIXTURE_RESPONSE = mockSimulate(FAIL_FIXTURE_REQUEST);

function variantOf(base: SimulateRequest, index: number, strategy: string | null): SimulateRequest {
  const lean = strategy === "cost" ? 1 : 0;
  const surge = strategy === "speed" || strategy === "coverage" ? 1 : 0;
  const stress = strategy === "infeasible" || strategy === "stress" ? 1 : 0;

  const teams = clamp(
    Math.round(base.resources.teams + (index - 1) * (2 - lean * 2) - stress * 4),
    1,
    20,
  );
  const vehicles = clamp(
    Math.round(base.resources.vehicles + (index - 2) * (3 - lean) + surge * 2 - stress * 5),
    1,
    30,
  );
  const budget = clamp(
    Math.round(base.resources.budget * (0.7 + index * 0.12) - stress * 90000 - lean * 20000),
    10000,
    500000,
  );
  const deadline_min = clamp(
    Math.round(base.constraints.deadline_min - index * (stress ? 8 : 2) + surge * 4),
    8,
    180,
  );

  return {
    name: `${base.name ?? "scenario"} · v${index + 1}`,
    incident_type: base.incident_type,
    resources: { teams, vehicles, budget },
    constraints: { deadline_min },
    priorities: { ...base.priorities },
  };
}

export function mockGenerate(req: GenerateRequest): GenerateResponse {
  const count = clamp(Math.round(req.count), 1, 8);
  const outcomes: ScenarioOutcome[] = [];
  for (let i = 0; i < count; i += 1) {
    const scenario = variantOf(req.base_scenario, i, req.strategy);
    const evaluated = evaluate(scenario);
    outcomes.push({ scenario_id: syntheticId(i, scenario), scenario, ...evaluated, persisted: true });
  }
  return { outcomes };
}

function syntheticId(index: number, scenario: SimulateRequest): string {
  return hashId(`gen${index}`, JSON.stringify(scenario));
}

function compareFromOutcomes(outcomes: ScenarioOutcome[]): CompareResponse {
  // /api/compare evaluates scenarios but never attempts to save them.
  const compareOutcomes = outcomes.map(({ persisted: _persisted, ...outcome }) => outcome);
  const ranking: RankingEntry[] = compareOutcomes
    .map((outcome) => ({
      scenario_id: outcome.scenario_id,
      rank: 0,
      score: outcome.score_breakdown.score,
      constraint_status: outcome.constraint_check.status,
    }))
    .sort((a, b) => {
      if (a.constraint_status !== b.constraint_status) {
        return a.constraint_status === "PASS" ? -1 : 1;
      }
      return b.score - a.score;
    })
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  const passing = ranking.filter((r) => r.constraint_status === "PASS");
  const feasible = passing.length > 0;
  const recommended = feasible ? passing[0] : null;

  const trade_offs: TradeOff[] = compareOutcomes.map((outcome) => ({
    scenario_id: outcome.scenario_id,
    response_time_min: outcome.result.response_time_min,
    cost: outcome.result.cost,
    coverage_pct: outcome.result.coverage_pct,
    score: outcome.score_breakdown.score,
  }));

  const recommendation: RecommendResponse = feasible
    ? {
        feasible: true,
        recommended_scenario_id: recommended?.scenario_id ?? null,
        reasoning: [
          `Rank 1 among ${passing.length} feasible variant(s) with score ${recommended?.score}.`,
          "Feasible variants are ranked by composite score (speed, cost, coverage) after constraint checks.",
          "Trade-offs still exist — inspect cost vs. response time before committing resources.",
        ],
      }
    : {
        feasible: false,
        recommended_scenario_id: null,
        reasoning: [
          "No variant satisfied every hard constraint (deadline and budget).",
          "Increase teams/vehicles, relax the deadline, or raise budget, then regenerate.",
          "The table below still shows infeasible outcomes so you can see how far each miss is.",
        ],
      };

  return { outcomes: compareOutcomes, ranking, recommendation, trade_offs };
}

const INFEASIBLE_BASE: SimulateRequest = {
  name: "Flash flood — starved allocation",
  resources: { teams: 2, vehicles: 2, budget: 22000 },
  constraints: { deadline_min: 12 },
  priorities: { speed: 0.5, cost: 0.2, coverage: 0.3 },
};

export const INFEASIBLE_COMPARE_FIXTURE: CompareResponse = compareFromOutcomes(
  mockGenerate({ base_scenario: INFEASIBLE_BASE, count: 4, strategy: "infeasible" }).outcomes,
);

export function mockCompare(req: CompareRequest): CompareResponse {
  if ("scenarios" in req && req.scenarios?.length) {
    const outcomes = req.scenarios.map((scenario, index) => ({
      scenario_id: syntheticId(index, scenario),
      scenario,
      ...evaluate(scenario),
    }));
    return compareFromOutcomes(outcomes);
  }

  if ("scenario_ids" in req && req.scenario_ids?.length) {
    const catalog: Record<string, SimulateRequest> = {
      [PASS_FIXTURE_RESPONSE.scenario_id]: PASS_FIXTURE_REQUEST,
      [FAIL_FIXTURE_RESPONSE.scenario_id]: FAIL_FIXTURE_REQUEST,
    };
    const outcomes = req.scenario_ids.map((id, index) => {
      const scenario = catalog[id] ?? variantOf(PASS_FIXTURE_REQUEST, index, null);
      return { scenario_id: syntheticId(index, scenario), scenario, ...evaluate(scenario) };
    });
    return compareFromOutcomes(outcomes);
  }

  return INFEASIBLE_COMPARE_FIXTURE;
}

export function mockRecommend(req: CompareRequest): RecommendResponse {
  return mockCompare(req).recommendation;
}

export const MOCK_SCENARIO_LIST: ScenarioSummary[] = [
  {
    scenario_id: PASS_FIXTURE_RESPONSE.scenario_id,
    name: PASS_FIXTURE_REQUEST.name,
    created_at: "2026-09-07T10:15:00Z",
    score: PASS_FIXTURE_RESPONSE.score_breakdown.score,
    constraint_status: PASS_FIXTURE_RESPONSE.constraint_check.status,
  },
  {
    scenario_id: FAIL_FIXTURE_RESPONSE.scenario_id,
    name: FAIL_FIXTURE_REQUEST.name,
    created_at: "2026-09-07T10:42:00Z",
    score: FAIL_FIXTURE_RESPONSE.score_breakdown.score,
    constraint_status: FAIL_FIXTURE_RESPONSE.constraint_check.status,
  },
];

