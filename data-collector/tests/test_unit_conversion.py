import pytest

from data_collector.unit_conversion import (
    ft_to_m,
    m_to_ft,
    lb_to_kg,
    kg_to_lb,
    mph_to_kmh,
    kts_to_kmh,
)


def test_ft_to_m():
    assert ft_to_m(13500) == pytest.approx(4114.8, abs=0.1)


def test_m_to_ft():
    assert m_to_ft(4114.8) == pytest.approx(13500, abs=1)


def test_ft_to_m_and_back_round_trips():
    assert m_to_ft(ft_to_m(1000)) == pytest.approx(1000, abs=0.01)


def test_lb_to_kg():
    assert lb_to_kg(1691) == pytest.approx(766.99, abs=0.1)


def test_kg_to_lb():
    assert kg_to_lb(767) == pytest.approx(1690.95, abs=0.1)


def test_mph_to_kmh():
    assert mph_to_kmh(140) == pytest.approx(225.3, abs=0.1)


def test_kts_to_kmh():
    assert kts_to_kmh(122) == pytest.approx(225.9, abs=0.1)
