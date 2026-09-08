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
  const ranks = new Map(response.ranking.map((rank) => [rank.scenario_id, rank]));
  const trades = new Map(response.trade_offs.map((trade) => [trade.scenario_id, trade]));

  return response.outcomes.map((outcome) => {
    const scenario_id = outcome.scenario_id;
    return {
      scenario_id,
      outcome,
      rank: ranks.get(scenario_id),
      trade: trades.get(scenario_id),
      recommended: Boolean(recommendedId && scenario_id === recommendedId),
    };
  });
}
