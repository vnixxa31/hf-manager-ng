from __future__ import annotations
import os
from fastapi.staticfiles import StaticFiles

import queue
import re
import threading
import uuid
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from huggingface_hub import HfApi, get_hf_file_metadata, hf_hub_download, hf_hub_url
from pydantic import BaseModel
from sqlalchemy import UniqueConstraint, event, func
from sqlmodel import Field, Session, SQLModel, col, create_engine, select


_db_path = os.environ.get("HF_DATABASE_PATH", "downloads.db")
engine = create_engine(f"sqlite:///{_db_path}", connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _set_wal_mode(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


class DownloadedFile(SQLModel, table=True):
    __tablename__ = "downloaded_files"
    __table_args__ = (UniqueConstraint("repo_id", "file_path"), {"extend_existing": True})

    id: int | None = Field(default=None, primary_key=True)
    repo_id: str
    file_path: str
    local_path: str
    size_bytes: int | None = None
    etag: str | None = None
    commit_hash: str | None = None
    first_downloaded_at: str
    last_downloaded_at: str
    download_count: int = Field(default=1)

QUANT_PATTERNS = [
    re.compile(r"\b(UD-Q\d+[_A-Z0-9]*)\b", re.IGNORECASE),
    re.compile(r"\b(IQ\d+[_A-Z0-9]*)\b", re.IGNORECASE),
    re.compile(r"\b((?<!UD-)Q\d+(?:_\d+)?[_A-Z0-9]*)\b", re.IGNORECASE),
    re.compile(
        r"\b(FP16|FP32|BF16|F16|F32|INT8|INT4|8BIT|4BIT|MXFP4_MOE)\b", re.IGNORECASE
    ),
]


def normalize_repo_input(repo_input: str) -> str:
    value = repo_input.strip()
    if not value:
        raise ValueError("Repository input cannot be empty.")

    if "huggingface.co" in value or "hf.co" in value:
        parsed = urlparse(value if "://" in value else f"https://{value}")
        path = parsed.path.strip("/")
        parts = [p for p in path.split("/") if p]
        if not parts:
            raise ValueError("Could not parse repository from URL.")

        if parts[0] in {"models", "spaces", "datasets"} and len(parts) >= 3:
            parts = parts[1:3]
        elif "blob" in parts:
            parts = parts[: parts.index("blob")]
        elif "tree" in parts:
            parts = parts[: parts.index("tree")]
        elif len(parts) > 2:
            parts = parts[:2]

        if len(parts) < 2:
            raise ValueError("Repository URL must include owner and repository name.")
        return f"{parts[0]}/{parts[1]}"

    plain_parts = [p for p in value.split("/") if p]
    if len(plain_parts) != 2:
        raise ValueError("Repository ID must be in the form 'owner/name'.")
    return f"{plain_parts[0]}/{plain_parts[1]}"


def detect_quantizations(file_path: str) -> list[str]:
    found: set[str] = set()
    for pattern in QUANT_PATTERNS:
        for match in pattern.findall(file_path):
            found.add(match.upper())
    return sorted(found)


@dataclass
class DownloadTask:
    task_id: str
    repo_id: str
    file_path: str
    status: Literal["queued", "downloading", "completed", "failed"]
    message: str = ""
    local_path: str = ""


class RepoRequest(BaseModel):
    repo_input: str
    token: str | None = None


class AddToQueueRequest(BaseModel):
    repo_id: str
    files: list[str]
    token: str | None = None


app = FastAPI(title="HF Download UI")
api_client = HfApi()
download_queue: queue.Queue[tuple[str, str, str, str | None]] = queue.Queue()
tasks_by_id: dict[str, DownloadTask] = {}
tasks_lock = threading.Lock()


def utcnow_iso() -> str:
    return datetime.now(UTC).isoformat()


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def fetch_file_tracking_metadata(
    repo_id: str,
    file_path: str,
    token: str | None = None,
) -> dict[str, str | int | None]:
    metadata = get_hf_file_metadata(
        hf_hub_url(repo_id=repo_id, filename=file_path),
        token=token,
    )
    return {
        "etag": metadata.etag,
        "commit_hash": metadata.commit_hash,
        "size_bytes": metadata.size,
    }


def record_download(
    repo_id: str,
    file_path: str,
    local_path: str,
    size_bytes: int | None,
    etag: str | None,
    commit_hash: str | None,
) -> None:
    downloaded_at = utcnow_iso()
    with Session(engine) as session:
        existing = session.exec(
            select(DownloadedFile).where(
                DownloadedFile.repo_id == repo_id,
                DownloadedFile.file_path == file_path,
            )
        ).first()
        if existing:
            existing.local_path = local_path
            existing.size_bytes = size_bytes if size_bytes is not None else existing.size_bytes
            existing.etag = etag if etag is not None else existing.etag
            existing.commit_hash = commit_hash if commit_hash is not None else existing.commit_hash
            existing.last_downloaded_at = downloaded_at
            existing.download_count += 1
            session.add(existing)
        else:
            session.add(
                DownloadedFile(
                    repo_id=repo_id,
                    file_path=file_path,
                    local_path=local_path,
                    size_bytes=size_bytes,
                    etag=etag,
                    commit_hash=commit_hash,
                    first_downloaded_at=downloaded_at,
                    last_downloaded_at=downloaded_at,
                )
            )
        session.commit()


def list_tracked_downloads() -> list[dict[str, object]]:
    with Session(engine) as session:
        rows = session.exec(
            select(DownloadedFile).order_by(
                func.datetime(DownloadedFile.last_downloaded_at).desc(),
                col(DownloadedFile.id).desc(),
            )
        ).all()

    return [
        {
            "repo_id": row.repo_id,
            "file_path": row.file_path,
            "local_path": row.local_path,
            "size_bytes": row.size_bytes,
            "etag": row.etag,
            "commit_hash": row.commit_hash,
            "first_downloaded_at": row.first_downloaded_at,
            "last_downloaded_at": row.last_downloaded_at,
            "download_count": row.download_count,
            "quantizations": detect_quantizations(row.file_path),
        }
        for row in rows
    ]


def get_repo_file_entries(
    repo_id: str, token: str | None = None
) -> list[dict[str, object]]:
    info = api_client.model_info(repo_id=repo_id, token=token, files_metadata=True)
    entries: list[dict[str, object]] = []
    for sibling in info.siblings or []:
        file_path = sibling.rfilename
        quantizations = detect_quantizations(file_path)
        entries.append(
            {
                "path": file_path,
                "size": sibling.size,
                "quantizations": quantizations,
            }
        )
    entries.sort(key=lambda item: str(item["path"]).lower())
    return entries


def download_worker() -> None:
    while True:
        task_id, repo_id, file_path, token = download_queue.get()
        with tasks_lock:
            task = tasks_by_id.get(task_id)
            if task is None:
                download_queue.task_done()
                continue
            task.status = "downloading"
            task.message = "Downloading..."

        try:
            downloaded_file = hf_hub_download(
                repo_id=repo_id,
                filename=file_path,
                token=token,
            )
            size_bytes = Path(downloaded_file).stat().st_size
            etag: str | None = None
            commit_hash: str | None = None

            try:
                metadata = fetch_file_tracking_metadata(
                    repo_id=repo_id, file_path=file_path, token=token
                )
                size_bytes = (
                    metadata["size_bytes"]
                    if isinstance(metadata["size_bytes"], int)
                    else size_bytes
                )
                etag = metadata["etag"] if isinstance(metadata["etag"], str) else None
                commit_hash = (
                    metadata["commit_hash"]
                    if isinstance(metadata["commit_hash"], str)
                    else None
                )
            except Exception:  # noqa: BLE001
                pass

            record_download(
                repo_id=repo_id,
                file_path=file_path,
                local_path=downloaded_file,
                size_bytes=size_bytes,
                etag=etag,
                commit_hash=commit_hash,
            )
            with tasks_lock:
                task.status = "completed"
                task.message = "Completed"
                task.local_path = downloaded_file
        except Exception as exc:  # noqa: BLE001
            with tasks_lock:
                task.status = "failed"
                task.message = str(exc)
        finally:
            download_queue.task_done()


init_db()
threading.Thread(target=download_worker, daemon=True).start()


@app.post("/api/repo/files")
def list_repo_files(payload: RepoRequest) -> dict[str, object]:
    try:
        repo_id = normalize_repo_input(payload.repo_input)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        files = get_repo_file_entries(repo_id=repo_id, token=payload.token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=400, detail=f"Failed to read repo: {exc}"
        ) from exc

    return {"repo_id": repo_id, "files": files}


@app.post("/api/queue/add")
def add_to_queue(payload: AddToQueueRequest) -> dict[str, object]:
    if not payload.files:
        raise HTTPException(
            status_code=400, detail="At least one file must be selected."
        )

    created_ids: list[str] = []
    for file_path in payload.files:
        task_id = uuid.uuid4().hex
        task = DownloadTask(
            task_id=task_id,
            repo_id=payload.repo_id,
            file_path=file_path,
            status="queued",
            message="Queued",
        )
        with tasks_lock:
            tasks_by_id[task_id] = task
        download_queue.put((task_id, payload.repo_id, file_path, payload.token))
        created_ids.append(task_id)

    return {"created": created_ids, "queued_count": len(created_ids)}


@app.get("/api/queue")
def get_queue() -> dict[str, object]:
    with tasks_lock:
        tasks = [asdict(task) for task in tasks_by_id.values()]
    tasks.sort(key=lambda item: item["task_id"], reverse=True)
    return {"tasks": tasks}


@app.get("/api/downloads")
def get_downloads() -> dict[str, object]:
    return {"downloads": list_tracked_downloads()}


if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")


def main() -> None:
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)


if __name__ == "__main__":
    main()
