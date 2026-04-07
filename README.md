# HF Download UI

Web UI for browsing files in a Hugging Face model repo and queuing selected files for download.

## Features

- Accepts Hugging Face repo IDs (`owner/model`) or URLs.
- Lists model files with inferred quantization tags.
- Supports filtering and batch selection with quantization chips.
- Queue-based downloader starts automatically in the background.
- Saves files under `./downloads/<owner__model>/`.
- Tracks downloaded files in `./downloads.db` with repo, file path, local path, timestamps, download count, commit hash, and Hub etag.
- Shows tracked downloads in the UI and exposes them via `GET /api/downloads`.

## Run

```bash
uv sync
uv run python main.py
```

Then open `http://127.0.0.1:8000`.

## Usage

1. Paste repo ID or URL and click `Load Files`.
2. Select files using checkboxes and quantization chips.
3. Click `Add Selected To Queue`.
4. Monitor status in the `Download Queue` table.
5. Review completed files in the `Tracked Downloads` table.

## Notes

- Private/gated repos require a token in the optional token field.
- Downloads are processed one file at a time by a background worker.
- Successful downloads are persisted in SQLite so later UI work can query a durable inventory instead of relying on in-memory task state.
