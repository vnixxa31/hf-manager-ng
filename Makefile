.PHONY: build dev prod

build:
	cd frontend && pnpm build

dev:
	uv run python main.py & pnpm dev

prod: build
	uv run python main.py