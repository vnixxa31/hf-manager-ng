import { useState, useEffect, useMemo, useCallback } from "react";

import { AppHeader } from "@/components/AppHeader";
import { DownloadsSection } from "@/components/DownloadsSection";
import { FilesSection } from "@/components/FilesSection";
import { QueueSection } from "@/components/QueueSection";
import { RepoSection } from "@/components/RepoSection";
import { loadRepoFiles, addToQueue, getQueue, getDownloads } from "@/lib/api";
import type { HFFile, DownloadTask, DownloadRecord, DownloadFilter } from "@/types";

export default function App() {
	// Input state
	const [repoInput, setRepoInput] = useState("");
	const [tokenInput, setTokenInput] = useState("");

	// Filter state
	const [searchQuery, setSearchQuery] = useState("");
	const [downloadFilter, setDownloadFilter] = useState<DownloadFilter>("all");
	const [activeQuant, setActiveQuant] = useState<string | null>(null);
	const [lastScrolledFilePath, setLastScrolledFilePath] = useState<string | null>(null);

	// Async state
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);
	const [polling, setPolling] = useState(false);
	const [statusMsg, setStatusMsg] = useState("No repo loaded.");

	// Data state
	const [repoId, setRepoId] = useState("");
	const [files, setFiles] = useState<HFFile[]>([]);
	const [tasks, setTasks] = useState<DownloadTask[]>([]);
	const [downloads, setDownloads] = useState<DownloadRecord[]>([]);

	// Polling — fetch queue + downloads every 2s, using Promise.all for parallelism
	useEffect(() => {
		const refresh = async () => {
			try {
				const [queueRes, downloadsRes] = await Promise.all([getQueue(), getDownloads()]);
				if (queueRes.ok) {
					const data = await queueRes.json();
					setTasks(data.tasks);
					setPolling(
						data.tasks.some(
							(t: DownloadTask) =>
								t.status === "queued" || t.status === "downloading",
						),
					);
				}
				if (downloadsRes.ok) {
					const data = await downloadsRes.json();
					setDownloads(data.downloads);
				}
			} catch {
				// ignore network errors during background polling
			}
		};

		void refresh();
		const id = setInterval(refresh, 2000);
		return () => clearInterval(id);
	}, []);

	// Map of file_path -> download record for the current repo
	const currentRepoDownloadsByPath = useMemo(() => {
		const map: Record<string, DownloadRecord> = {};
		if (!repoId) return map;
		for (const dl of downloads) {
			if (dl.repo_id === repoId) map[dl.file_path] = dl;
		}
		return map;
	}, [repoId, downloads]);

	// Unique quantization tags across all loaded files
	const quantTags = useMemo(() => {
		const s = new Set<string>();
		for (const f of files) {
			for (const q of f.quantizations) s.add(q);
		}
		return Array.from(s).sort();
	}, [files]);

	// Filtered file list (by download status + search query)
	const filteredFiles = useMemo(() => {
		let result = files;

		if (downloadFilter === "downloaded") {
			result = result.filter((f) => !!currentRepoDownloadsByPath[f.path]);
		} else if (downloadFilter === "not_downloaded") {
			result = result.filter((f) => !currentRepoDownloadsByPath[f.path]);
		}

		const q = searchQuery.trim().toLowerCase();
		if (q) {
			result = result.filter((f) => f.path.toLowerCase().includes(q));
		}

		return result;
	}, [files, downloadFilter, searchQuery, currentRepoDownloadsByPath]);

	const handleLoadFiles = useCallback(async () => {
		const input = repoInput.trim();
		if (!input) return;

		setLoading(true);
		setError(false);
		setStatusMsg("Loading files...");
		setFiles([]);
		setActiveQuant(null);
		setLastScrolledFilePath(null);

		try {
			const res = await loadRepoFiles(input, tokenInput.trim() || null);
			const data = await res.json();
			if (!res.ok) {
				setError(true);
				setStatusMsg(data.detail ?? "Failed to load repo.");
				return;
			}
			setRepoId(data.repo_id);
			setFiles(
				data.files.map((f: Omit<HFFile, "selected">) => ({
					...f,
					selected: false,
				})),
			);
			setStatusMsg(`Loaded ${data.files.length} files from ${data.repo_id}`);
		} catch (e) {
			setError(true);
			setStatusMsg(`Network error: ${e instanceof Error ? e.message : String(e)}`);
		} finally {
			setLoading(false);
		}
	}, [repoInput, tokenInput]);

	const handleAddToQueue = useCallback(async () => {
		const selected = files.filter((f) => f.selected).map((f) => f.path);
		if (!selected.length || !repoId) return;

		const res = await addToQueue(repoId, selected, tokenInput.trim() || null);
		if (res.ok) {
			setFiles((prev) => prev.map((f) => ({ ...f, selected: false })));
			setLastScrolledFilePath(null);
			// Immediate refresh after queuing
			const [queueRes, downloadsRes] = await Promise.all([getQueue(), getDownloads()]);
			if (queueRes.ok) {
				const data = await queueRes.json();
				setTasks(data.tasks);
				setPolling(
					data.tasks.some(
						(t: DownloadTask) => t.status === "queued" || t.status === "downloading",
					),
				);
			}
			if (downloadsRes.ok) {
				const data = await downloadsRes.json();
				setDownloads(data.downloads);
			}
		}
	}, [files, repoId, tokenInput]);

	const handleToggleFileSelection = useCallback((path: string) => {
		setFiles((prev) =>
			prev.map((f) => (f.path === path ? { ...f, selected: !f.selected } : f)),
		);
	}, []);

	const handleToggleAll = useCallback(
		(checked: boolean) => {
			const visiblePaths = new Set(filteredFiles.map((f) => f.path));
			setFiles((prev) =>
				prev.map((f) => (visiblePaths.has(f.path) ? { ...f, selected: checked } : f)),
			);
		},
		[filteredFiles],
	);

	const handleSelectVisible = useCallback(() => {
		const visiblePaths = new Set(filteredFiles.map((f) => f.path));
		setFiles((prev) =>
			prev.map((f) => (visiblePaths.has(f.path) ? { ...f, selected: true } : f)),
		);
	}, [filteredFiles]);

	const handleClearSelection = useCallback(() => {
		setFiles((prev) => prev.map((f) => ({ ...f, selected: false })));
		setLastScrolledFilePath(null);
	}, []);

	const handleToggleQuant = useCallback(
		(q: string) => {
			const hasMatches = files.some((f) => f.quantizations.includes(q));
			if (hasMatches) {
				setFiles((prev) =>
					prev.map((f) => (f.quantizations.includes(q) ? { ...f, selected: true } : f)),
				);
			}

			setActiveQuant(q);

			const visibleMatch = filteredFiles.find((f) => f.quantizations.includes(q));
			setLastScrolledFilePath(visibleMatch?.path ?? null);
		},
		[files, filteredFiles],
	);

	const handleDownloadFilterToggle = useCallback((mode: "downloaded" | "not_downloaded") => {
		setDownloadFilter((prev) => (prev === mode ? "all" : mode));
	}, []);

	return (
		<div className="mx-auto max-w-270 px-6 py-12 pb-16 text-sm leading-6 transition-colors">
			<AppHeader polling={polling} />

			<RepoSection
				repoInput={repoInput}
				tokenInput={tokenInput}
				loading={loading}
				statusMsg={statusMsg}
				error={error}
				onRepoInputChange={setRepoInput}
				onTokenInputChange={setTokenInput}
				onLoadFiles={handleLoadFiles}
			/>

			{files.length > 0 && (
				<FilesSection
					files={files}
					filteredFiles={filteredFiles}
					quantTags={quantTags}
					activeQuant={activeQuant}
					searchQuery={searchQuery}
					downloadFilter={downloadFilter}
					currentRepoDownloadsByPath={currentRepoDownloadsByPath}
					lastScrolledFilePath={lastScrolledFilePath}
					onSearchChange={setSearchQuery}
					onDownloadFilterToggle={handleDownloadFilterToggle}
					onSelectVisible={handleSelectVisible}
					onClearSelection={handleClearSelection}
					onToggleQuant={handleToggleQuant}
					onToggleFileSelection={handleToggleFileSelection}
					onToggleAll={handleToggleAll}
					onAddToQueue={handleAddToQueue}
				/>
			)}

			{tasks.length > 0 && <QueueSection tasks={tasks} />}

			{downloads.length > 0 && <DownloadsSection downloads={downloads} />}
		</div>
	);
}
