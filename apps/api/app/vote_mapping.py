import re
import unicodedata


def _normalize(value: str | None) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    return (
        re.sub(r"\s+", " ", "".join(c for c in text if not unicodedata.combining(c)))
        .strip()
        .upper()
    )


DIRECT_MAP = {
    "SIM": "SIM",
    "NAO": "NAO",
    "ABSTENCAO": "ABST",
    "ABST": "ABST",
    "OBSTRUCAO": "OBSTRUCAO",
    "OBSTRUÇÃO": "OBSTRUCAO",
    "P-NRV": "AUSENTE",
    "NAO REGISTROU VOTO": "AUSENTE",
    "AUSENTE": "AUSENTE",
    "AP": "LICENCA",
    "MIS": "LICENCA",
    "LS": "LICENCA",
    "LAP": "LICENCA",
    "LP": "LICENCA",
    "VOTOU": "SECRETO",
}


def canonical_vote(value: str | None) -> str:
    normalized = _normalize(value)
    if normalized.startswith("PRESIDENTE"):
        return "PRESIDENTE"
    return DIRECT_MAP.get(normalized, "AUSENTE")
