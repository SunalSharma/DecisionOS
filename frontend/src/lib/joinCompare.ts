import type { CompareResponse, RankingEntry, ScenarioOutcome, TradeOff } from "../types/domain";

export interface JoinedOutcome {
  scenario_id: string;
  outcome: ScenarioOutcome;
  rank: RankingEntry | undefined;
  trade: TradeOff | undefined;
  recommended: boolean;
}

/**
 * Outcomes, ranking, and trade_offs all carry scenario_id (backend contract as of
 * fix/namish-requirements-cors) — join directly on it, no inference needed.
 */
export function joinCompareOutcomes(response: CompareResponse): JoinedOutcome[] {
  const recommendedId = response.recommendation.recommended_scenario_id;

  return response.outcomes.map((outcome) => {
    const scenario_id = outcome.scenario_id;
    const trade = response.trade_offs.find((t) => t.scenario_id === scenario_id);
    const rank = response.ranking.find((r) => r.scenario_id === scenario_id);

    return {
      scenario_id,
      outcome,
      rank,
      trade,
      recommended: Boolean(recommendedId && scenario_id === recommendedId),
    };
  });
}
