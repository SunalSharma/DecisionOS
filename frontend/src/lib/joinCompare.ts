import type { CompareResponse, RankingEntry, ScenarioOutcome, TradeOff } from "../types/domain";

export interface JoinedOutcome {
  scenario_id: string;
  outcome: ScenarioOutcome;
  rank: RankingEntry | undefined;
  trade: TradeOff | undefined;
  recommended: boolean;
}

/**
 * Outcomes from generate/compare omit scenario_id; ranking and trade_offs carry it.
 * Join by metric tuple first, then fall back to array index — do not invent API fields.
 */
export function joinCompareOutcomes(response: CompareResponse): JoinedOutcome[] {
  const usedTrade = new Set<string>();
  const recommendedId = response.recommendation.recommended_scenario_id;

  return response.outcomes.map((outcome, index) => {
    const metricMatch = response.trade_offs.find((t) => {
      if (usedTrade.has(t.scenario_id)) return false;
      return (
        t.response_time_min === outcome.result.response_time_min &&
        t.cost === outcome.result.cost &&
        t.coverage_pct === outcome.result.coverage_pct &&
        t.score === outcome.score_breakdown.score
      );
    });
    const trade = metricMatch ?? response.trade_offs[index];
    if (trade) usedTrade.add(trade.scenario_id);

    const rank =
      (trade && response.ranking.find((r) => r.scenario_id === trade.scenario_id)) ||
      response.ranking[index];

    const scenario_id = rank?.scenario_id ?? trade?.scenario_id ?? `index-${index}`;
    return {
      scenario_id,
      outcome,
      rank,
      trade,
      recommended: Boolean(recommendedId && scenario_id === recommendedId),
    };
  });
}
