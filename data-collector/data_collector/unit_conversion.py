"""Pure, exact unit-conversion math. No plausibility judgment lives here -- see
reliability.py for that."""

FT_PER_M = 3.280839895
LB_PER_KG = 2.204622622
KM_PER_MI = 1.609344


def ft_to_m(value: float) -> float:
    return value / FT_PER_M


def m_to_ft(value: float) -> float:
    return value * FT_PER_M


def lb_to_kg(value: float) -> float:
    return value / LB_PER_KG


def kg_to_lb(value: float) -> float:
    return value * LB_PER_KG


def mph_to_kmh(value: float) -> float:
    return value * KM_PER_MI


def kmh_to_mph(value: float) -> float:
    return value / KM_PER_MI


def kts_to_kmh(value: float) -> float:
    return value * 1.852


def kmh_to_kts(value: float) -> float:
    return value / 1.852
