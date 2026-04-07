import type { DownloadRecord } from "@/types";

export function formatSize(bytes: number | null | undefined): string {
	if (bytes == null || bytes === 0) return "-";
	const units = ["B", "KB", "MB", "GB", "TB"] as const;
	let val = bytes;
	let idx = 0;
	while (val >= 1024 && idx < units.length - 1) {
		val /= 1024;
		idx++;
	}
	return `${val.toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
}

function shortHash(value: string): string {
	return value.slice(0, 12);
}

export function formatFingerprint(download: DownloadRecord): string {
	if (download.etag) return `etag ${shortHash(download.etag)}`;
	if (download.commit_hash) return `commit ${shortHash(download.commit_hash)}`;
	return "No Hub fingerprint";
}

export function formatTimestamp(value: string | null | undefined): string {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleString();
}

export function downloadStatusText(download: DownloadRecord): string {
	const when = formatTimestamp(download.last_downloaded_at);
	const count = download.download_count || 0;
	if (count > 1) return `Last downloaded ${when} (${count}x)`;
	return `Downloaded ${when}`;
}
