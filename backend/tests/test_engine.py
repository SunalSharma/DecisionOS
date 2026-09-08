import unittest

from backend.engine.constraints import check_constraints
from backend.engine.explanation import explain
from backend.engine.generation import generate_variants
from backend.engine.models import Constraints, Priorities, Resources, Scenario, ScenarioOutcome
from backend.engine.recommendation import rank, recommend
from backend.engine.scoring import score
from backend.engine.simulation import simulate


def make_outcome(scenario: Scenario) -> ScenarioOutcome:
    result = simulate(scenario)
    constraint_check = check_constraints(scenario, result)
    score_breakdown = score(scenario, result)
    return ScenarioOutcome(
        scenario=scenario,
        result=result,
        constraint_check=constraint_check,
        score_breakdown=score_breakdown,
        explanation=explain(scenario, result, constraint_check, score_breakdown),
    )


class DecisionEngineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.base = Scenario(
            id="base",
            name="Base",
            resources=Resources(teams=10, vehicles=10, budget=500000),
            constraints=Constraints(deadline_min=45, min_coverage_pct=60),
            priorities=Priorities(speed=1, cost=1, coverage=1),
        )

    def test_simulation_is_deterministic(self) -> None:
        self.assertEqual(simulate(self.base), simulate(self.base))

    def test_zero_resources_have_zero_utilization(self) -> None:
        zero = Scenario(
            id="zero",
            name=None,
            resources=Resources(teams=0, vehicles=0, budget=100000),
            constraints=Constraints(deadline_min=60, min_coverage_pct=0),
            priorities=Priorities(speed=1, cost=1, coverage=1),
        )
        result = simulate(zero)
        self.assertEqual(result.resource_utilization_pct, 0.0)

    def test_priorities_change_score(self) -> None:
        fast = Scenario(
            id="fast",
            name=None,
            resources=self.base.resources,
            constraints=self.base.constraints,
            priorities=Priorities(speed=1, cost=0, coverage=0),
        )
        coverage = Scenario(
            id="coverage",
            name=None,
            resources=self.base.resources,
            constraints=self.base.constraints,
            priorities=Priorities(speed=0, cost=0, coverage=1),
        )
        self.assertNotEqual(score(fast, simulate(fast)).score, score(coverage, simulate(coverage)).score)

    def test_each_hard_constraint_reports_its_named_violation(self) -> None:
        cases = [
            (
                "budget",
                Scenario(
                    "budget", None, Resources(10, 10, 100000),
                    Constraints(60, 0), Priorities(1, 1, 1),
                ),
            ),
            (
                "deadline_min",
                Scenario(
                    "deadline", None, Resources(10, 10, 500000),
                    Constraints(10, 0), Priorities(1, 1, 1),
                ),
            ),
            (
                "min_coverage_pct",
                Scenario(
                    "coverage", None, Resources(1, 0, 500000),
                    Constraints(60, 60), Priorities(1, 1, 1),
                ),
            ),
        ]
        for expected_name, scenario in cases:
            with self.subTest(expected_name=expected_name):
                check = check_constraints(scenario, simulate(scenario))
                self.assertEqual(check.status, "FAIL")
                self.assertEqual([violation.name for violation in check.violations], [expected_name])

    def test_ranking_prioritizes_pass_before_fail_and_all_fail_has_no_pick(self) -> None:
        passing = make_outcome(self.base)
        failing = make_outcome(
            Scenario(
                "high-score-fail", None, Resources(20, 20, 1),
                Constraints(60, 0), Priorities(1, 1, 1),
            )
        )
        ranking = rank([failing, passing])
        self.assertEqual(ranking[0].scenario_id, passing.scenario.id)

        all_failed = recommend([failing])
        self.assertFalse(all_failed.feasible)
        self.assertIsNone(all_failed.recommended_scenario_id)
        self.assertTrue(all_failed.reasoning)

    def test_generation_strategies_produce_distinct_pairs_for_small_and_large_bases(self) -> None:
        bases = [
            Scenario(
                id="small",
                name=None,
                resources=Resources(teams=3, vehicles=3, budget=5_000_000),
                constraints=Constraints(deadline_min=60, min_coverage_pct=0),
                priorities=Priorities(speed=1, cost=1, coverage=1),
            ),
            Scenario(
                id="large",
                name=None,
                resources=Resources(teams=20, vehicles=20, budget=5_000_000),
                constraints=Constraints(deadline_min=60, min_coverage_pct=0),
                priorities=Priorities(speed=1, cost=1, coverage=1),
            ),
        ]
        strategies = (
            "speed_optimized",
            "cost_optimized",
            "balanced",
            "perturbed",
            "speed",
            "cost",
            "coverage",
            "infeasible",
        )
        for base in bases:
            for strategy in strategies:
                with self.subTest(base=base.id, strategy=strategy):
                    variants = generate_variants(base, count=10, strategy=strategy)
                    pairs = [
                        (variant.resources.teams, variant.resources.vehicles)
                        for variant in variants
                    ]
                    self.assertEqual(len(variants), 10)
                    self.assertEqual(len(pairs), len(set(pairs)))

    def test_infeasible_variants_fail_with_a_large_budget(self) -> None:
        well_funded = Scenario(
            id="well-funded",
            name=None,
            resources=Resources(teams=10, vehicles=10, budget=5_000_000),
            constraints=Constraints(deadline_min=60, min_coverage_pct=0),
            priorities=Priorities(speed=1, cost=1, coverage=1),
        )
        variants = generate_variants(well_funded, count=10, strategy="infeasible")
        self.assertEqual(len(variants), 10)
        for variant in variants:
            with self.subTest(variant=variant.id):
                self.assertEqual(
                    check_constraints(variant, simulate(variant)).status,
                    "FAIL",
                )

    def test_balanced_variants_explore_below_and_above_the_base_cost(self) -> None:
        budget_constrained = Scenario(
            id="budget-constrained",
            name=None,
            resources=Resources(teams=8, vehicles=12, budget=500_000),
            constraints=Constraints(deadline_min=60, min_coverage_pct=0),
            priorities=Priorities(speed=1, cost=1, coverage=1),
        )
        base_cost = simulate(budget_constrained).cost
        variants = generate_variants(budget_constrained, count=4, strategy="balanced")
        costs = [simulate(variant).cost for variant in variants]
        statuses = [
            check_constraints(variant, simulate(variant)).status
            for variant in variants
        ]

        self.assertTrue(any(cost < base_cost for cost in costs))
        self.assertTrue(any(cost > base_cost for cost in costs))
        self.assertIn("PASS", statuses)


if __name__ == "__main__":
    unittest.main()
