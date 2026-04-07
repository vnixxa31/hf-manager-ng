function app() {
	return {
		repoInput: "",
		tokenInput: "",
		searchQuery: "",
		downloadFilter: "all",
		activeQuant: null,
		lastScrolledFilePath: null,
		loading: false,
		error: false,
		polling: false,
		statusMsg: "No repo loaded.",
		repoId: "",
		files: [],
		tasks: [],
		downloads: [],
		darkMode: false,

		get quantTags() {
			const s = new Set();
			for (const f of this.files) {
				for (const q of f.quantizations) s.add(q);
			}
			return Array.from(s).sort();
		},

		get currentRepoDownloadsByPath() {
			const map = {};
			if (!this.repoId) return map;
			for (const download of this.downloads) {
				if (download.repo_id !== this.repoId) continue;
				map[download.file_path] = download;
			}
			return map;
		},

		init() {
			const saved = localStorage.getItem("theme");
			if (saved === "dark") {
				this.darkMode = true;
			} else if (saved === "light") {
				this.darkMode = false;
			} else {
				this.darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
			}
			this.refreshQueue();
			this.refreshDownloads();
			setInterval(() => {
				this.refreshQueue();
				this.refreshDownloads();
			}, 2000);
		},

		toggleTheme() {
			this.darkMode = !this.darkMode;
			localStorage.setItem("theme", this.darkMode ? "dark" : "light");
		},

		formatSize(bytes) {
			if (bytes == null || bytes === 0) return "-";
			const units = ["B", "KB", "MB", "GB", "TB"];
			let val = bytes;
			let idx = 0;
			while (val >= 1024 && idx < units.length - 1) {
				val /= 1024;
				idx++;
			}
			return `${val.toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
		},

		shortHash(value) {
			if (!value) return "-";
			return value.slice(0, 12);
		},

		formatFingerprint(download) {
			if (download.etag) return `etag ${this.shortHash(download.etag)}`;
			if (download.commit_hash) return `commit ${this.shortHash(download.commit_hash)}`;
			return "No Hub fingerprint";
		},

		formatTimestamp(value) {
			if (!value) return "-";
			const date = new Date(value);
			if (Number.isNaN(date.getTime())) return value;
			return date.toLocaleString();
		},

		downloadStatusText(download) {
			if (!download) return "";
			const when = this.formatTimestamp(download.last_downloaded_at);
			const count = download.download_count || 0;
			if (count > 1) {
				return `Last downloaded ${when} (${count}x)`;
			}
			return `Downloaded ${when}`;
		},

		filteredFiles() {
			let result = this.files;

			if (this.downloadFilter === "downloaded") {
				result = result.filter((f) => !!this.currentRepoDownloadsByPath[f.path]);
			} else if (this.downloadFilter === "not_downloaded") {
				result = result.filter((f) => !this.currentRepoDownloadsByPath[f.path]);
			}

			const q = this.searchQuery.trim().toLowerCase();
			if (q) {
				result = result.filter((f) => f.path.toLowerCase().includes(q));
			}
			return result;
		},

		toggleDownloadFilter(mode) {
			this.downloadFilter = this.downloadFilter === mode ? "all" : mode;
		},

		selectedCount() {
			return this.files.filter((f) => f.selected).length;
		},

		selectedSize() {
			return this.files.filter((f) => f.selected).reduce((sum, f) => sum + (f.size || 0), 0);
		},

		allVisibleSelected() {
			const vis = this.filteredFiles();
			return vis.length > 0 && vis.every((f) => f.selected);
		},

		toggleAll(event) {
			const checked = event.target.checked;
			for (const f of this.filteredFiles()) {
				f.selected = checked;
			}
		},

		toggleQuant(q) {
			const matches = this.files.filter((f) => f.quantizations.includes(q));
			if (!matches.length) {
				this.activeQuant = q;
				this.lastScrolledFilePath = null;
				return;
			}

			for (const file of matches) {
				file.selected = true;
			}

			this.activeQuant = q;

			const visibleMatch = this.filteredFiles().find((file) =>
				file.quantizations.includes(q),
			);
			if (!visibleMatch) {
				this.lastScrolledFilePath = null;
				return;
			}

			this.lastScrolledFilePath = visibleMatch.path;
			this.$nextTick(() => {
				const selector = `[data-file-path="${CSS.escape(visibleMatch.path)}"]`;
				const row = this.$refs.filesTableScroll?.querySelector(selector);
				row?.scrollIntoView({ block: "center", behavior: "smooth" });
			});
		},

		selectVisible() {
			for (const f of this.filteredFiles()) f.selected = true;
		},

		clearSelection() {
			for (const f of this.files) f.selected = false;
			this.lastScrolledFilePath = null;
		},

		async loadFiles() {
			const input = this.repoInput.trim();
			if (!input) return;
			this.loading = true;
			this.error = false;
			this.statusMsg = "Loading files...";
			this.files = [];
			this.activeQuant = null;
			this.lastScrolledFilePath = null;

			try {
				const res = await fetch("/api/repo/files", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						repo_input: input,
						token: this.tokenInput.trim() || null,
					}),
				});
				const data = await res.json();
				if (!res.ok) {
					this.error = true;
					this.statusMsg = data.detail || "Failed to load repo.";
					return;
				}
				this.repoId = data.repo_id;
				this.files = data.files.map((f) => ({ ...f, selected: false }));
				this.statusMsg = `Loaded ${this.files.length} files from ${this.repoId}`;
			} catch (e) {
				this.error = true;
				this.statusMsg = "Network error: " + e.message;
			} finally {
				this.loading = false;
			}
		},

		async addToQueue() {
			const selected = this.files.filter((f) => f.selected).map((f) => f.path);
			if (!selected.length || !this.repoId) return;

			const res = await fetch("/api/queue/add", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					repo_id: this.repoId,
					files: selected,
					token: this.tokenInput.trim() || null,
				}),
			});
			if (res.ok) {
				this.clearSelection();
				await this.refreshQueue();
				await this.refreshDownloads();
			}
		},

		async refreshQueue() {
			try {
				const res = await fetch("/api/queue");
				const data = await res.json();
				if (res.ok) {
					this.tasks = data.tasks;
					this.polling = this.tasks.some(
						(t) => t.status === "queued" || t.status === "downloading",
					);
				}
			} catch {
				/* ignore */
			}
		},

		async refreshDownloads() {
			try {
				const res = await fetch("/api/downloads");
				const data = await res.json();
				if (res.ok) {
					this.downloads = data.downloads;
				}
			} catch {
				/* ignore */
			}
		},
	};
}
