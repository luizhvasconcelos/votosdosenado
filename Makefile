.PHONY: setup db-up db-down ingest ingest-elections api web test lint dev

setup:
	python3 -m venv .venv
	.venv/bin/pip install -e 'apps/api[dev]'
	cd apps/web && npm install

db-up:
	docker compose up -d db

db-down:
	docker compose down

ingest:
	cd apps/api && ../../.venv/bin/python -m app.cli ingest --senators --votes --profiles --activities

ingest-elections:
	cd apps/api && ../../.venv/bin/python -m app.cli elections --years 2018 2022 2026 --photos-dir ../web/public/candidatos

api:
	cd apps/api && ../../.venv/bin/uvicorn app.main:app --reload --port 8000

web:
	cd apps/web && npm run dev

test:
	.venv/bin/pytest apps/api/tests
	cd apps/web && npm test

lint:
	.venv/bin/ruff check apps/api
	cd apps/web && npm run lint

dev:
	./scripts/dev.sh
