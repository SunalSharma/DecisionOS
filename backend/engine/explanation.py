"""Human-readable explanation generation for scenario outcomes."""

from .models import ConstraintCheck, Scenario, ScoreBreakdown, SimulationResult


def explain(
    scenario: Scenario,
    result: SimulationResult,
    constraint_check: ConstraintCheck,
    score_breakdown: ScoreBreakdown,
) -> list[str]:
    """Summarize simulation performance, feasibility, and the weighted score."""
    lines = [
        (
            f"{scenario.name or scenario.id} covers {result.coverage_pct:.1f}% of demand "
            f"with an estimated response time of {result.response_time_min:.1f} minutes."
        ),
        f"Estimated operational cost is {result.cost:.2f}; weighted score is {score_breakdown.score:.1f}/100.",
        f"Risk level is {result.risk.value}.",
    ]
    if constraint_check.status == "PASS":
        lines.append("All hard budget, deadline, and coverage constraints pass.")
    else:
        lines.append(
            "Constraint failures: "
            + ", ".join(violation.name for violation in constraint_check.violations)
            + "."
        )
    return lines
