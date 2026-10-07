# votosdosenado

Plataforma cívica open source para visualizar quem são os senadores, como votam e como esses votos se relacionam com partido, bloco, campo político e pautas prioritárias.

> Projeto independente, sem vínculo com o Senado Federal. Dados obtidos das APIs públicas oficiais.

## Rodar localmente

Pré-requisitos: Python 3.12+, Node 20+ e Docker.

```bash
cp .env.example .env
make setup
make db-up
make ingest
make dev
```

- Site: http://localhost:3000
- API: http://127.0.0.1:8000
- Documentação da API: http://127.0.0.1:8000/docs

Para uma experiência sem Docker, remova ou não crie o `.env`: a API usa SQLite (`apps/api/votosdosenado.db`) por padrão.

## Arquitetura

```text
apps/api   FastAPI + SQLAlchemy; ingestão, métricas e API pública
apps/web   Next.js; páginas SSR, hemiciclo e imagens Open Graph
infra      arquivos de infraestrutura local
scripts    comandos operacionais
```

O importador é idempotente e consome:

- `GET /dadosabertos/senador/lista/atual`
- `GET /dadosabertos/votacao`

Totais ausentes são recalculados a partir de `votos[]`. A sigla original é preservada e uma categoria canônica é gravada separadamente.

O workflow `Atualização de dados` agenda uma carga diária e cargas horárias nos dias usuais de sessão. Falhas ficam visíveis nas notificações do repositório. No ambiente puramente local, o mesmo processo é executado por `make ingest`.

## Comandos

```bash
make setup       # instala Python e Node
make db-up       # inicia PostgreSQL
make ingest      # carrega Senado e recalcula índices
make ingest-elections # resultados TSE de 2018, 2022 e 2026 + fotos dos eleitos
make test        # testes das duas aplicações
make lint        # Ruff + ESLint
make dev         # API e site em modo desenvolvimento
```

## Licenças

- Código: AGPL-3.0-only
- Dados derivados: CC BY 4.0
- Curadoria editorial: CC BY-ND 4.0

Contribuições usam DCO: inclua `Signed-off-by: Nome <email>` no commit.
