export async function loadRepoFiles(repoInput: string, token: string | null) {
	return fetch("/api/repo/files", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ repo_input: repoInput, token }),
	});
}

export async function addToQueue(repoId: string, files: string[], token: string | null) {
	return fetch("/api/queue/add", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ repo_id: repoId, files, token }),
	});
}

export async function getQueue() {
	return fetch("/api/queue");
}

export async function getDownloads() {
	return fetch("/api/downloads");
}
