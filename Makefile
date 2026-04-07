.PHONY: build dev prod

build:
	pnpm build

dev:
	uv run python main.py & pnpm dev

prod: build
	uv run python main.py