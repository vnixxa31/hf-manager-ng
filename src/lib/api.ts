import type { RepoFilesResponse, QueueResponse, DownloadsResponse, ApiError } from "@/types";

// ── Helpers ─────────────────────────────────────────────────────────

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function jsonResult<T>(response: Response): Promise<Result<T>> {
	const data: unknown = await response.json();

	if (!response.ok) {
		const message = (data as ApiError).detail ?? `Request failed (${response.status})`;
		return { ok: false, error: message };
	}

	return { ok: true, data: data as T };
}

// ── API functions ───────────────────────────────────────────────────

export async function loadRepoFiles(
	repoInput: string,
	token: string | null,
): Promise<Result<RepoFilesResponse>> {
	const response = await fetch("/api/repo/files", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ repo_input: repoInput, token }),
	});

	return jsonResult<RepoFilesResponse>(response);
}

export async function addToQueue(
	repoId: string,
	files: string[],
	token: string | null,
): Promise<Result<QueueResponse>> {
	const response = await fetch("/api/queue/add", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ repo_id: repoId, files, token }),
	});

	return jsonResult<QueueResponse>(response);
}

export async function getQueue(): Promise<Result<QueueResponse>> {
	return jsonResult<QueueResponse>(await fetch("/api/queue"));
}

export async function getDownloads(): Promise<Result<DownloadsResponse>> {
	return jsonResult<DownloadsResponse>(await fetch("/api/downloads"));
}
