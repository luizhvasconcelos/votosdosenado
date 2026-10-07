from __future__ import annotations

import re
import unicodedata

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .models import Matter, MatterTheme, Theme

THEME_DEFINITIONS = (
    {
        "slug": "seguranca-publica",
        "nome": "Segurança pública",
        "resumo": "Criminalidade, forças de segurança, sistema penal, armas e proteção da população.",
        "keywords": (
            "seguranca publica",
            "policia",
            "criminal",
            "crime",
            "penal",
            "arma",
            "violencia",
            "trafico",
        ),
    },
    {
        "slug": "tributacao",
        "nome": "Tributação",
        "resumo": "Impostos, contribuições, benefícios fiscais e distribuição da arrecadação.",
        "keywords": (
            "tribut",
            "imposto",
            "contribuicao",
            "fiscal",
            "arrecad",
            "icms",
            "ipi",
            "renda",
        ),
    },
    {
        "slug": "stf-e-judiciario",
        "nome": "STF e Judiciário",
        "resumo": "Organização da Justiça, tribunais, magistratura e instituições essenciais ao sistema judicial.",
        "keywords": (
            "supremo tribunal federal",
            "stf",
            "judici",
            "tribunal",
            "magistr",
            "conselho nacional de justica",
            "cnj",
        ),
    },
    {
        "slug": "agro",
        "nome": "Agro",
        "resumo": "Produção rural, agricultura, pecuária, crédito e regularização fundiária.",
        "keywords": ("agric", "agro", "rural", "pecuaria", "fundiari", "safra", "produtor rural"),
    },
    {
        "slug": "direitos-e-costumes",
        "nome": "Direitos e costumes",
        "resumo": "Direitos civis, família, igualdade, liberdade religiosa e debates de comportamento social.",
        "keywords": (
            "direitos humanos",
            "familia",
            "relig",
            "genero",
            "racismo",
            "igualdade",
            "crianca",
            "adolescente",
        ),
    },
    {
        "slug": "economia",
        "nome": "Economia",
        "resumo": "Orçamento, emprego, crédito, empresas, indústria e desenvolvimento econômico.",
        "keywords": (
            "econom",
            "orcament",
            "credito",
            "emprego",
            "empresa",
            "industr",
            "financeir",
            "divida",
            "banco",
        ),
    },
    {
        "slug": "educacao",
        "nome": "Educação",
        "resumo": "Ensino, escolas, universidades, formação profissional e políticas educacionais.",
        "keywords": (
            "educa",
            "ensino",
            "escola",
            "universidade",
            "estudante",
            "professor",
            "alfabet",
        ),
    },
    {
        "slug": "saude",
        "nome": "Saúde",
        "resumo": "Sistema de saúde, medicamentos, profissionais, prevenção e atendimento à população.",
        "keywords": (
            "saude",
            "sus",
            "medic",
            "hospital",
            "doenca",
            "vacina",
            "sanitari",
            "paciente",
        ),
    },
    {
        "slug": "meio-ambiente",
        "nome": "Meio ambiente",
        "resumo": "Clima, conservação, recursos naturais, energia limpa e proteção ambiental.",
        "keywords": (
            "ambient",
            "clima",
            "florest",
            "desmat",
            "conserva",
            "sustent",
            "carbono",
            "recursos naturais",
        ),
    },
)


def normalize(value: str) -> str:
    return "".join(
        char
        for char in unicodedata.normalize("NFKD", value.lower())
        if not unicodedata.combining(char)
    )


def classify_text(value: str) -> list[str]:
    text = normalize(value)
    return [
        definition["slug"]
        for definition in THEME_DEFINITIONS
        if any(re.search(rf"\b{re.escape(keyword)}", text) for keyword in definition["keywords"])
    ]


def sync_themes(session: Session) -> int:
    existing = {theme.slug: theme for theme in session.scalars(select(Theme)).all()}
    for definition in THEME_DEFINITIONS:
        if definition["slug"] not in existing:
            theme = Theme(slug=definition["slug"], nome=definition["nome"])
            session.add(theme)
            session.flush()
            existing[theme.slug] = theme
        else:
            existing[definition["slug"]].nome = definition["nome"]

    session.execute(delete(MatterTheme).where(MatterTheme.origem == "automatica"))
    count = 0
    for matter in session.scalars(select(Matter)).all():
        for slug in classify_text(matter.ementa or ""):
            session.add(
                MatterTheme(materia_id=matter.id, tema_id=existing[slug].id, origem="automatica")
            )
            count += 1
    session.commit()
    return count


def theme_summary(slug: str) -> str:
    return next(
        (definition["resumo"] for definition in THEME_DEFINITIONS if definition["slug"] == slug),
        "Tema legislativo acompanhado pelo projeto.",
    )
