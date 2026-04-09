.PHONY: up down logs db-reset test-smoke

up:
	docker compose up --build

up-d:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

db-reset:
	docker compose down -v
	docker compose up --build -d

test-smoke:
	docker compose up --build --wait --timeout 180
	bash tests/smoke.sh
	docker compose down
