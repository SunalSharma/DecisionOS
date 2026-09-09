import unittest

from backend.engine.constraints import check_constraints
from backend.engine.domain_data import get_incident_profile
from backend.engine.explanation import explain
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


def profile_scenario(
    incident_type: str,
    teams: int,
    vehicles: int,
    budget: float,
    deadline_min: float,
) -> Scenario:
    profile = get_incident_profile(incident_type)
    return Scenario(
        id=incident_type,
        name=incident_type,
        resources=Resources(teams=teams, vehicles=vehicles, budget=budget),
        constraints=Constraints(
            deadline_min=deadline_min,
            min_coverage_pct=profile.min_coverage_pct,
        ),
        priorities=Priorities(speed=1, cost=1, coverage=1),
        incident_type=incident_type,
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

    def test_earthquake_response_profile_supports_pass_and_fail_outcomes(self) -> None:
        passing = profile_scenario("earthquake_response", 30, 24, 2_860_000, 100)
        failing = profile_scenario("earthquake_response", 30, 24, 1, 100)
        self.assertEqual(check_constraints(passing, simulate(passing)).status, "PASS")
        self.assertEqual(check_constraints(failing, simulate(failing)).status, "FAIL")

    def test_tsunami_evacuation_profile_supports_pass_and_fail_outcomes(self) -> None:
        passing = profile_scenario("tsunami_evacuation", 12, 8, 530_000, 25)
        failing = profile_scenario("tsunami_evacuation", 12, 8, 1, 25)
        self.assertEqual(check_constraints(passing, simulate(passing)).status, "PASS")
        self.assertEqual(check_constraints(failing, simulate(failing)).status, "FAIL")

    def test_wildfire_containment_profile_supports_pass_and_fail_outcomes(self) -> None:
        passing = profile_scenario("wildfire_containment", 45, 15, 2_970_000, 160)
        failing = profile_scenario("wildfire_containment", 45, 15, 1, 160)
        self.assertEqual(check_constraints(passing, simulate(passing)).status, "PASS")
        self.assertEqual(check_constraints(failing, simulate(failing)).status, "FAIL")

    def test_industrial_accident_profile_supports_pass_and_fail_outcomes(self) -> None:
        passing = profile_scenario("industrial_accident", 16, 10, 1_660_000, 50)
        failing = profile_scenario("industrial_accident", 16, 10, 1, 50)
        self.assertEqual(check_constraints(passing, simulate(passing)).status, "PASS")
        self.assertEqual(check_constraints(failing, simulate(failing)).status, "FAIL")


if __name__ == "__main__":
    unittest.main()
