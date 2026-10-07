from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from time import sleep
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import LegislativeActivity, Senator

BASE_URL = "https://legis.senado.leg.br/dadosabertos/senador"
PROJECT_PREFIXES = ("PEC", "PL", "PLC", "PLP", "PLS", "PRS", "PDS", "PDL")


def _as_list(value: Any) -> list[dict[str, Any]]:
    if not value:
        return []
    return value if isinstance(value, list) else [value]


def _date(value: str | None) -> date | None:
    return date.fromisoformat(value[:10]) if value else None


def _items(payload: dict[str, Any], root: str, container: str, item: str) -> list[dict[str, Any]]:
    parlamentar = payload.get(root, {}).get("Parlamentar", {})
    return _as_list((parlamentar.get(container) or {}).get(item))


def parse_activity_payloads(
    senator: Senator, payloads: dict[str, dict[str, Any]], data_ref: date | None = None
) -> dict[str, Any]:
    reference = data_ref or date.today()
    start = senator.mandato_inicio or date(reference.year - 8, 1, 1)

    authorships = [
        row
        for row in _items(payloads["autorias"], "MateriasAutoriaParlamentar", "Autorias", "Autoria")
        if (_date((row.get("Materia") or {}).get("Data")) or date.min) >= start
    ]
    reports = [
        row
        for row in _items(
            payloads["relatorias"], "MateriasRelatoriaParlamentar", "Relatorias", "Relatoria"
        )
        if (_date(row.get("DataDesignacao")) or date.min) >= start
    ]
    speeches = [
        row
        for row in _items(
            payloads["discursos"], "DiscursosParlamentar", "Pronunciamentos", "Pronunciamento"
        )
        if (_date(row.get("DataPronunciamento")) or date.min) >= start
    ]
    apartes = [
        row
        for row in _items(payloads["apartes"], "ApartesParlamentar", "Apartes", "Aparte")
        if (_date(row.get("DataPronunciamento")) or date.min) >= start
    ]
    commissions = [
        row
        for row in _items(
            payloads["comissoes"], "MembroComissaoParlamentar", "MembroComissoes", "Comissao"
        )
        if not row.get("DataFim") and (_date(row.get("DataInicio")) or date.min) <= reference
    ]

    projects = [
        row
        for row in authorships
        if str((row.get("Materia") or {}).get("Sigla") or "").upper().startswith(PROJECT_PREFIXES)
    ]

    def matter_item(row: dict[str, Any]) -> dict[str, Any]:
        matter = row.get("Materia") or {}
        code = str(matter.get("Codigo") or "")
        return {
            "codigo": code,
            "identificacao": matter.get("DescricaoIdentificacao") or "Matéria legislativa",
            "ementa": matter.get("Ementa") or "",
            "data": matter.get("Data") or row.get("DataDesignacao"),
            "url": f"https://www25.senado.leg.br/web/atividade/materias/-/materia/{code}"
            if code
            else None,
        }

    authored_recent = sorted(
        projects, key=lambda row: (row.get("Materia") or {}).get("Data") or "", reverse=True
    )
    reports_recent = sorted(reports, key=lambda row: row.get("DataDesignacao") or "", reverse=True)
    speeches_recent = sorted(
        speeches, key=lambda row: row.get("DataPronunciamento") or "", reverse=True
    )

    return {
        "data_ref": reference,
        "periodo_inicio": start,
        "autorias_total": len(authorships),
        "projetos_autoria": len(projects),
        "autorias_principais": sum(
            row.get("IndicadorAutorPrincipal") == "Sim" for row in authorships
        ),
        "relatorias": len(reports),
        "discursos": len(speeches),
        "apartes": len(apartes),
        "comissoes_ativas": len(commissions),
        "autorias_recentes": [matter_item(row) for row in authored_recent[:12]],
        "relatorias_recentes": [matter_item(row) for row in reports_recent[:12]],
        "discursos_recentes": [
            {
                "codigo": str(row.get("CodigoPronunciamento") or ""),
                "data": row.get("DataPronunciamento"),
                "resumo": row.get("TextoResumo") or "Pronunciamento no Senado",
                "url": row.get("UrlTexto"),
            }
            for row in speeches_recent[:12]
        ],
        "comissoes": [
            {
                "sigla": (row.get("IdentificacaoComissao") or {}).get("SiglaComissao"),
                "nome": (row.get("IdentificacaoComissao") or {}).get("NomeComissao"),
                "participacao": row.get("DescricaoParticipacao"),
                "inicio": row.get("DataInicio"),
            }
            for row in commissions
        ],
    }


def _get_json(client: httpx.Client, url: str) -> dict[str, Any]:
    for attempt in range(5):
        response = client.get(url)
        if response.status_code == 429 or response.status_code >= 500:
            if attempt == 4:
                response.raise_for_status()
            retry_after = response.headers.get("Retry-After")
            sleep(float(retry_after) if retry_after else 2**attempt)
            continue
        response.raise_for_status()
        return response.json()
    raise RuntimeError("Resposta oficial indisponível após retentativas")


def _fetch_bundle(client: httpx.Client, senator: Senator) -> tuple[int, dict[str, dict[str, Any]]]:
    payloads = {}
    for endpoint in ("autorias", "relatorias", "discursos", "apartes", "comissoes"):
        payloads[endpoint] = _get_json(client, f"{BASE_URL}/{senator.codigo_senado}/{endpoint}")
    return senator.id, payloads


def ingest_legislative_activities(session: Session, workers: int = 2) -> int:
    reference = date.today()
    senators = session.scalars(
        select(Senator)
        .outerjoin(LegislativeActivity)
        .where(
            Senator.ativo.is_(True),
            ~Senator.codigo_senado.startswith("TSE-"),
            (LegislativeActivity.id.is_(None) | (LegislativeActivity.data_ref < reference)),
        )
    ).all()
    by_id = {senator.id: senator for senator in senators}
    count = 0
    with (
        httpx.Client(
            timeout=90,
            follow_redirects=True,
            headers={"Accept": "application/json", "User-Agent": "votosdosenado/0.1"},
        ) as client,
        ThreadPoolExecutor(max_workers=workers) as executor,
    ):
        futures = {executor.submit(_fetch_bundle, client, senator): senator for senator in senators}
        for future in as_completed(futures):
            senator = futures[future]
            try:
                senator_id, payloads = future.result()
            except (httpx.HTTPError, ValueError) as error:
                print(f"Atividade não importada para {senator.nome_parlamentar}: {error}")
                continue
            values = parse_activity_payloads(by_id[senator_id], payloads)
            row = session.scalar(
                select(LegislativeActivity).where(LegislativeActivity.senador_id == senator_id)
            )
            if row is None:
                row = LegislativeActivity(senador_id=senator_id, **values)
                session.add(row)
            else:
                for key, value in values.items():
                    setattr(row, key, value)
            session.commit()
            count += 1
    return count
