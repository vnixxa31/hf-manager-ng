// Backend JSON shapes

export interface HFFile {
	path: string;
	size: number | null;
	quantizations: string[];
}

export interface DownloadTask {
	task_id: string;
	repo_id: string;
	file_path: string;
	status: "queued" | "downloading" | "completed" | "failed";
	message: string | null;
}

export interface DownloadRecord {
	repo_id: string;
	file_path: string;
	local_path: string;
	size_bytes: number | null;
	etag: string | null;
	commit_hash: string | null;
	last_downloaded_at: string | null;
	download_count: number;
	quantizations: string[];
}

// API response shapes

export interface RepoFilesResponse {
	repo_id: string;
	files: HFFile[];
}

export interface QueueResponse {
	tasks: DownloadTask[];
}

export interface DownloadsResponse {
	downloads: DownloadRecord[];
}

export interface ApiError {
	detail: string;
}

// UI-specific

export type DownloadFilter = "all" | "downloaded" | "not_downloaded";
