.PHONY: build dev prod clean

build:
	pnpm build

dev:
	uv run python main.py & pnpm dev

prod: build
	uv run python main.py

clean:
	rm -rf downloads.db downloads.db-shm downloads.db-wal downloads/