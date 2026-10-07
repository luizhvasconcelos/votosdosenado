import csv
import zipfile
from pathlib import Path

from app.tse import _aggregate


def test_aggregate_filters_senate_candidates(tmp_path: Path):
    archive = tmp_path / "tse.zip"
    csv_file = tmp_path / "votes.csv"
    fields = [
        "DS_CARGO", "NR_TURNO", "SG_UF", "NM_URNA_CANDIDATO",
        "NM_CANDIDATO", "QT_VOTOS_NOMINAIS", "DS_SIT_TOT_TURNO",
    ]
    with csv_file.open("w", encoding="latin-1", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=fields, delimiter=";")
        writer.writeheader()
        writer.writerow({
            "DS_CARGO": "Senador", "NR_TURNO": "1", "SG_UF": "AC",
            "NM_URNA_CANDIDATO": "Candidata", "NM_CANDIDATO": "Nome Completo",
            "QT_VOTOS_NOMINAIS": "42", "DS_SIT_TOT_TURNO": "ELEITO",
        })
        writer.writerow({
            "DS_CARGO": "Deputado Federal", "NR_TURNO": "1", "SG_UF": "AC",
            "NM_URNA_CANDIDATO": "Outro", "NM_CANDIDATO": "Outro Nome",
            "QT_VOTOS_NOMINAIS": "99", "DS_SIT_TOT_TURNO": "ELEITO",
        })
    with zipfile.ZipFile(archive, "w") as zipped:
        zipped.write(csv_file, "votes.csv")

    result = _aggregate(archive)

    assert result[("AC", "CANDIDATA")]["votes"] == 42
    assert len(result) == 1
