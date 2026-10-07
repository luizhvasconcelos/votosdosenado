PARTY_SPECTRUM = {
    "PL": "direita",
    "NOVO": "direita",
    "REPUBLICANOS": "direita",
    "PP": "direita",
    "PRD": "direita",
    "UNIÃO": "direita",
    "UNIAO": "direita",
    "PSD": "centro",
    "MDB": "centro",
    "PODE": "centro",
    "PSDB": "centro",
    "CIDADANIA": "centro",
    "PSB": "esquerda",
    "PDT": "esquerda",
    "PT": "esquerda",
    "PV": "esquerda",
    "PCDOB": "esquerda",
    "REDE": "esquerda",
    "PSOL": "esquerda",
}


def spectrum_for_party(party: str | None) -> str:
    return PARTY_SPECTRUM.get((party or "").upper(), "centro")
