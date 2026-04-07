.PHONY: build dev prod clean

build:
	vp build

dev:
	uv run python main.py & vp dev

prod: build
	uv run python main.py

clean:
	rm -rf downloads.db downloads.db-shm downloads.db-wal downloads/