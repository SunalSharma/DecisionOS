"""Risk classification for simulated emergency-response scenarios."""

from .models import RiskLevel


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def assess_risk(
    response_time_min: float,
    coverage_pct: float,
    deadline_min: float,
    hard_constraints_failed: bool = False,
) -> RiskLevel:
    """Classify risk from deadline pressure and the uncovered-demand gap."""
    if deadline_min <= 0:
        deadline_pressure = 1.0 if response_time_min > 0 else 0.0
    else:
        deadline_pressure = _clamp(response_time_min / deadline_min, 0.0, 1.0)
    coverage_gap = _clamp(1.0 - coverage_pct / 100.0, 0.0, 1.0)
    risk_score = 0.5 * deadline_pressure + 0.5 * coverage_gap

    if hard_constraints_failed or risk_score >= 0.5:
        return RiskLevel.HIGH
    if risk_score >= 0.2:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW
