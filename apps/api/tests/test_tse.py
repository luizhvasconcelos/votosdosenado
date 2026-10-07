import csv
import zipfile
from pathlib import Path

from app.tse import _aggregate, _is_elected_status


def test_elected_status_does_not_confuse_not_elected():
    assert _is_elected_status("Eleito") is True
    assert _is_elected_status("Eleito por média") is True
    assert _is_elected_status("Não eleito") is False


def test_aggregate_filters_senate_candidates(tmp_path: Path):
    archive = tmp_path / "tse.zip"
    csv_file = tmp_path / "votes.csv"
    fields = [
        "DS_CARGO", "NR_TURNO", "SG_UF", "NM_URNA_CANDIDATO",
        "NM_CANDIDATO", "QT_VOTOS_NOMINAIS", "DS_SIT_TOT_TURNO",
        "SQ_CANDIDATO", "SG_PARTIDO",
    ]
    with csv_file.open("w", encoding="latin-1", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=fields, delimiter=";")
        writer.writeheader()
        writer.writerow({
            "DS_CARGO": "Senador", "NR_TURNO": "1", "SG_UF": "AC",
            "NM_URNA_CANDIDATO": "Candidata", "NM_CANDIDATO": "Nome Completo",
            "QT_VOTOS_NOMINAIS": "42", "DS_SIT_TOT_TURNO": "ELEITO",
            "SQ_CANDIDATO": "100", "SG_PARTIDO": "PT",
        })
        writer.writerow({
            "DS_CARGO": "Deputado Federal", "NR_TURNO": "1", "SG_UF": "AC",
            "NM_URNA_CANDIDATO": "Outro", "NM_CANDIDATO": "Outro Nome",
            "QT_VOTOS_NOMINAIS": "99", "DS_SIT_TOT_TURNO": "ELEITO",
            "SQ_CANDIDATO": "101", "SG_PARTIDO": "MDB",
        })
    with zipfile.ZipFile(archive, "w") as zipped:
        zipped.write(csv_file, "votes.csv")

    result = _aggregate(archive)

    assert result[("AC", "CANDIDATA")]["votes"] == 42
    assert len(result) == 1
