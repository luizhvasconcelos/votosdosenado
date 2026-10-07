from datetime import date

from app.activity import parse_activity_payloads
from app.models import Senator


def _payload(root, container, item, values):
    return {root: {"Parlamentar": {container: {item: values}}}}


def test_activity_parser_filters_to_current_mandate():
    senator = Senator(
        codigo_senado="1",
        nome_parlamentar="Teste",
        uf="CE",
        partido_sigla="P",
        espectro_partido="centro",
        mandato_inicio=date(2023, 2, 1),
    )
    matter = {
        "Materia": {
            "Codigo": "10",
            "DescricaoIdentificacao": "PL 10/2024",
            "Sigla": "PL",
            "Data": "2024-03-01",
            "Ementa": "Projeto de teste",
        },
        "IndicadorAutorPrincipal": "Sim",
    }
    old_matter = {
        "Materia": {
            "Codigo": "9",
            "DescricaoIdentificacao": "PL 9/2020",
            "Sigla": "PL",
            "Data": "2020-03-01",
        }
    }
    payloads = {
        "autorias": _payload(
            "MateriasAutoriaParlamentar", "Autorias", "Autoria", [matter, old_matter]
        ),
        "relatorias": _payload("MateriasRelatoriaParlamentar", "Relatorias", "Relatoria", []),
        "discursos": _payload(
            "DiscursosParlamentar",
            "Pronunciamentos",
            "Pronunciamento",
            [{"CodigoPronunciamento": "4", "DataPronunciamento": "2025-01-01"}],
        ),
        "apartes": _payload("ApartesParlamentar", "Apartes", "Aparte", []),
        "comissoes": _payload(
            "MembroComissaoParlamentar",
            "MembroComissoes",
            "Comissao",
            [
                {
                    "IdentificacaoComissao": {"SiglaComissao": "CCJ", "NomeComissao": "CCJ"},
                    "DescricaoParticipacao": "Titular",
                    "DataInicio": "2023-03-01",
                }
            ],
        ),
    }

    result = parse_activity_payloads(senator, payloads, date(2026, 10, 7))

    assert result["projetos_autoria"] == 1
    assert result["autorias_principais"] == 1
    assert result["discursos"] == 1
    assert result["comissoes_ativas"] == 1
    assert result["autorias_recentes"][0]["identificacao"] == "PL 10/2024"
