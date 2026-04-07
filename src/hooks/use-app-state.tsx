import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { loadRepoFiles, addToQueue, getQueue, getDownloads } from "@/lib/api";
import type { HFFile, DownloadTask, DownloadRecord, DownloadFilter } from "@/types";

// ── Selection tracking ──────────────────────────────────────────────

// Selection is UI-only state, kept separate from domain HFFile data.
// We use a Set<string> keyed by file path for O(1) lookups.

// ── Context shape ───────────────────────────────────────────────────

interface AppState {
	// Inputs
	repoInput: string;
	tokenInput: string;
	setRepoInput: (value: string) => void;
	setTokenInput: (value: string) => void;

	// Filters
	searchQuery: string;
	downloadFilter: DownloadFilter;
	activeQuant: string | null;
	lastScrolledFilePath: string | null;
	setSearchQuery: (value: string) => void;
	toggleDownloadFilter: (mode: "downloaded" | "not_downloaded") => void;

	// Async status
	loading: boolean;
	error: boolean;
	statusMsg: string;

	// Derived
	polling: boolean;
	repoId: string;
	files: HFFile[];
	filteredFiles: HFFile[];
	quantTags: string[];
	selectedPaths: ReadonlySet<string>;
	selectedCount: number;
	selectedSize: number;
	allVisibleSelected: boolean;
	tasks: DownloadTask[];
	downloads: DownloadRecord[];
	currentRepoDownloadsByPath: Readonly<Record<string, DownloadRecord>>;

	// Actions
	handleLoadFiles: () => Promise<void>;
	handleAddToQueue: () => Promise<void>;
	toggleFileSelection: (path: string) => void;
	toggleAllVisible: (checked: boolean) => void;
	selectAllVisible: () => void;
	clearSelection: () => void;
	toggleQuant: (q: string) => void;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

// ── Provider ────────────────────────────────────────────────────────

export function AppStateProvider({ children }: { children: ReactNode }) {
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
	const [statusMsg, setStatusMsg] = useState("No repo loaded.");

	// Data state
	const [repoId, setRepoId] = useState("");
	const [files, setFiles] = useState<HFFile[]>([]);
	const [selectedPaths, setSelectedPaths] = useState<ReadonlySet<string>>(new Set());
	const [tasks, setTasks] = useState<DownloadTask[]>([]);
	const [downloads, setDownloads] = useState<DownloadRecord[]>([]);

	// Derived: polling is true when any task is active — no separate state needed
	const polling = useMemo(
		() => tasks.some((t) => t.status === "queued" || t.status === "downloading"),
		[tasks],
	);

	// Polling — fetch queue + downloads every 2 s
	useEffect(() => {
		const refresh = async () => {
			try {
				const [queueRes, downloadsRes] = await Promise.all([getQueue(), getDownloads()]);
				if (queueRes.ok) setTasks(queueRes.data.tasks);
				if (downloadsRes.ok) setDownloads(downloadsRes.data.downloads);
			} catch {
				// ignore network errors during background polling
			}
		};

		void refresh();
		const id = setInterval(refresh, 2000);
		return () => clearInterval(id);
	}, []);

	// Map of file_path → download record for the current repo
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

	// Selection derived values
	const selectedCount = selectedPaths.size;

	const selectedSize = useMemo(() => {
		let total = 0;
		for (const f of files) {
			if (selectedPaths.has(f.path)) total += f.size ?? 0;
		}
		return total;
	}, [files, selectedPaths]);

	const allVisibleSelected = useMemo(
		() => filteredFiles.length > 0 && filteredFiles.every((f) => selectedPaths.has(f.path)),
		[filteredFiles, selectedPaths],
	);

	// ── Actions ─────────────────────────────────────────────────────

	const handleLoadFiles = useCallback(async () => {
		const input = repoInput.trim();
		if (!input) return;

		setLoading(true);
		setError(false);
		setStatusMsg("Loading files...");
		setFiles([]);
		setSelectedPaths(new Set());
		setActiveQuant(null);
		setLastScrolledFilePath(null);

		try {
			const result = await loadRepoFiles(input, tokenInput.trim() || null);
			if (!result.ok) {
				setError(true);
				setStatusMsg(result.error);
				return;
			}
			setRepoId(result.data.repo_id);
			setFiles(result.data.files);
			setStatusMsg(`Loaded ${result.data.files.length} files from ${result.data.repo_id}`);
		} catch (e) {
			setError(true);
			setStatusMsg(`Network error: ${e instanceof Error ? e.message : String(e)}`);
		} finally {
			setLoading(false);
		}
	}, [repoInput, tokenInput]);

	const refreshQueueAndDownloads = useCallback(async () => {
		const [queueRes, downloadsRes] = await Promise.all([getQueue(), getDownloads()]);
		if (queueRes.ok) setTasks(queueRes.data.tasks);
		if (downloadsRes.ok) setDownloads(downloadsRes.data.downloads);
	}, []);

	const handleAddToQueue = useCallback(async () => {
		const selected = files.filter((f) => selectedPaths.has(f.path)).map((f) => f.path);
		if (selected.length === 0 || !repoId) return;

		const result = await addToQueue(repoId, selected, tokenInput.trim() || null);
		if (result.ok) {
			setSelectedPaths(new Set());
			setLastScrolledFilePath(null);
			await refreshQueueAndDownloads();
		}
	}, [files, selectedPaths, repoId, tokenInput, refreshQueueAndDownloads]);

	const toggleFileSelection = useCallback((path: string) => {
		setSelectedPaths((prev) => {
			const next = new Set(prev);
			if (next.has(path)) next.delete(path);
			else next.add(path);
			return next;
		});
	}, []);

	const toggleAllVisible = useCallback(
		(checked: boolean) => {
			const visiblePaths = filteredFiles.map((f) => f.path);
			setSelectedPaths((prev) => {
				const next = new Set(prev);
				for (const p of visiblePaths) {
					if (checked) next.add(p);
					else next.delete(p);
				}
				return next;
			});
		},
		[filteredFiles],
	);

	const selectAllVisible = useCallback(() => {
		const visiblePaths = filteredFiles.map((f) => f.path);
		setSelectedPaths((prev) => {
			const next = new Set(prev);
			for (const p of visiblePaths) next.add(p);
			return next;
		});
	}, [filteredFiles]);

	const clearSelection = useCallback(() => {
		setSelectedPaths(new Set());
		setLastScrolledFilePath(null);
	}, []);

	const toggleQuant = useCallback(
		(q: string) => {
			const matchingPaths = files
				.filter((f) => f.quantizations.includes(q))
				.map((f) => f.path);

			if (matchingPaths.length > 0) {
				setSelectedPaths((prev) => {
					const next = new Set(prev);
					for (const p of matchingPaths) next.add(p);
					return next;
				});
			}

			setActiveQuant(q);

			const visibleMatch = filteredFiles.find((f) => f.quantizations.includes(q));
			setLastScrolledFilePath(visibleMatch?.path ?? null);
		},
		[files, filteredFiles],
	);

	const toggleDownloadFilter = useCallback((mode: "downloaded" | "not_downloaded") => {
		setDownloadFilter((prev) => (prev === mode ? "all" : mode));
	}, []);

	// ── Context value ───────────────────────────────────────────────

	const value = useMemo<AppState>(
		() => ({
			repoInput,
			tokenInput,
			setRepoInput,
			setTokenInput,
			searchQuery,
			downloadFilter,
			activeQuant,
			lastScrolledFilePath,
			setSearchQuery,
			toggleDownloadFilter,
			loading,
			error,
			statusMsg,
			polling,
			repoId,
			files,
			filteredFiles,
			quantTags,
			selectedPaths,
			selectedCount,
			selectedSize,
			allVisibleSelected,
			tasks,
			downloads,
			currentRepoDownloadsByPath,
			handleLoadFiles,
			handleAddToQueue,
			toggleFileSelection,
			toggleAllVisible,
			selectAllVisible,
			clearSelection,
			toggleQuant,
		}),
		[
			repoInput,
			tokenInput,
			searchQuery,
			downloadFilter,
			activeQuant,
			lastScrolledFilePath,
			toggleDownloadFilter,
			loading,
			error,
			statusMsg,
			polling,
			repoId,
			files,
			filteredFiles,
			quantTags,
			selectedPaths,
			selectedCount,
			selectedSize,
			allVisibleSelected,
			tasks,
			downloads,
			currentRepoDownloadsByPath,
			handleLoadFiles,
			handleAddToQueue,
			toggleFileSelection,
			toggleAllVisible,
			selectAllVisible,
			clearSelection,
			toggleQuant,
		],
	);

	return <AppStateContext value={value}>{children}</AppStateContext>;
}

// ── Hook ────────────────────────────────────────────────────────────

export function useAppState(): AppState {
	const ctx = useContext(AppStateContext);
	if (ctx === undefined) {
		throw new Error("useAppState must be used within an AppStateProvider");
	}
	return ctx;
}
