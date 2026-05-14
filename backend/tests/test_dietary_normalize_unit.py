"""_normalize_dietary_prefs saf birim testleri (RTDB şekil varyasyonları)."""

import pytest

from api.user import _normalize_dietary_prefs


@pytest.mark.parametrize(
    "raw,expected",
    [
        (None, {"tags": [], "custom_note": ""}),
        ("", {"tags": [], "custom_note": ""}),
        ([], {"tags": [], "custom_note": ""}),
        ({}, {"tags": [], "custom_note": ""}),
        ({"tags": None, "custom_note": None}, {"tags": [], "custom_note": ""}),
        (
            {"tags": "  vegan  ", "custom_note": "x"},
            {"tags": ["vegan"], "custom_note": "x"},
        ),
        (
            {"tags": [" a ", "b"], "custom_note": ""},
            {"tags": ["a", "b"], "custom_note": ""},
        ),
        (
            {"tags": {"0": "x", "1": None}, "custom_note": 42},
            {"tags": ["x"], "custom_note": "42"},
        ),
    ],
)
def test_normalize_dietary_prefs_shapes(raw, expected):
    assert _normalize_dietary_prefs(raw) == expected
