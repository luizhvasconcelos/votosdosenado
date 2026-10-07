import pytest

from app.vote_mapping import canonical_vote


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("Sim", "SIM"),
        ("Não", "NAO"),
        ("Abstenção", "ABST"),
        ("Obstrução", "OBSTRUCAO"),
        ("AP", "LICENCA"),
        ("MIS", "LICENCA"),
        ("P-NRV", "AUSENTE"),
        ("Presidente (art. 51 RISF)", "PRESIDENTE"),
        ("Votou", "SECRETO"),
        (None, "AUSENTE"),
    ],
)
def test_canonical_vote(raw, expected):
    assert canonical_vote(raw) == expected
