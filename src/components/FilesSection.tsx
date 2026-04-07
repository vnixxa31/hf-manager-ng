import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAppState } from "@/hooks/use-app-state";
import { formatSize, downloadStatusText } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FilesSection() {
	const {
		files,
		filteredFiles,
		quantTags,
		activeQuant,
		searchQuery,
		downloadFilter,
		currentRepoDownloadsByPath,
		lastScrolledFilePath,
		selectedPaths,
		selectedCount,
		selectedSize,
		allVisibleSelected,
		setSearchQuery,
		toggleDownloadFilter,
		selectAllVisible,
		clearSelection,
		toggleQuant,
		toggleFileSelection,
		toggleAllVisible,
		handleAddToQueue,
	} = useAppState();

	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!lastScrolledFilePath || !scrollRef.current) return;
		const selector = `[data-file-path="${CSS.escape(lastScrolledFilePath)}"]`;
		const row = scrollRef.current.querySelector(selector);
		row?.scrollIntoView({ block: "center", behavior: "smooth" });
	}, [lastScrolledFilePath]);

	return (
		<section aria-labelledby="files-heading" className="border-border bg-card mt-8 border p-5">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<h2 id="files-heading" className="font-sans text-xl leading-7">
					Files{" "}
					<span className="text-muted-foreground font-mono text-xs">
						({filteredFiles.length}/{files.length})
					</span>
				</h2>
				<p className="text-muted-foreground text-xs" aria-live="polite">
					{selectedCount} selected — {formatSize(selectedSize)}
				</p>
			</div>

			{/* Filters row */}
			<div className="mb-3 flex flex-wrap items-center gap-2">
				<div className="relative min-w-50 flex-1">
					<MagnifyingGlassIcon
						aria-hidden="true"
						className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
					/>
					<label className="sr-only" htmlFor="file-search">
						Filter filenames
					</label>
					<Input
						id="file-search"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						type="search"
						placeholder="Filter filenames..."
						className="h-9 w-full py-2 pr-3 pl-8"
					/>
				</div>

				<div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter actions">
					<Button
						variant={downloadFilter === "downloaded" ? "default" : "outline"}
						size="sm"
						aria-pressed={downloadFilter === "downloaded"}
						onClick={() => toggleDownloadFilter("downloaded")}
					>
						Downloaded
					</Button>
					<Button
						variant={downloadFilter === "not_downloaded" ? "default" : "outline"}
						size="sm"
						aria-pressed={downloadFilter === "not_downloaded"}
						onClick={() => toggleDownloadFilter("not_downloaded")}
					>
						Not Downloaded
					</Button>
					<Button variant="outline" size="sm" onClick={selectAllVisible}>
						Select Visible
					</Button>
					<Button variant="outline" size="sm" onClick={clearSelection}>
						Clear
					</Button>
				</div>
			</div>

			{/* Quant chips */}
			{quantTags.length > 0 && (
				<div
					className="mb-3 flex flex-wrap gap-1.5"
					role="group"
					aria-label="Quantization filters"
				>
					{quantTags.map((q) => (
						<Badge
							key={q}
							role="button"
							tabIndex={0}
							aria-pressed={activeQuant === q}
							onClick={() => toggleQuant(q)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									toggleQuant(q);
								}
							}}
							variant={activeQuant === q ? "default" : "outline"}
							className="cursor-pointer"
						>
							{q}
						</Badge>
					))}
				</div>
			)}

			{/* File table */}
			<div className="border-border overflow-hidden border">
				<div ref={scrollRef} className="max-h-105 overflow-auto" tabIndex={-1}>
					<Table>
						<TableHeader className="sticky top-0 z-10">
							<TableRow className="border-border bg-muted hover:bg-muted">
								<TableHead className="border-border w-10 px-3 py-2">
									<Checkbox
										checked={allVisibleSelected}
										onCheckedChange={(checked) =>
											toggleAllVisible(checked === true)
										}
										aria-label="Select all visible files"
									/>
								</TableHead>
								<TableHead className="border-border text-muted-foreground px-3 py-2 text-xs font-semibold tracking-wide uppercase">
									File
								</TableHead>
								<TableHead className="border-border text-muted-foreground w-24 px-3 py-2 text-right text-xs font-semibold tracking-wide uppercase">
									Size
								</TableHead>
								<TableHead className="border-border text-muted-foreground w-36 px-3 py-2 text-xs font-semibold tracking-wide uppercase">
									Quant
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredFiles.map((file) => {
								const dlRecord = currentRepoDownloadsByPath[file.path];
								const isSelected = selectedPaths.has(file.path);

								return (
									<TableRow
										key={file.path}
										data-file-path={file.path}
										onClick={() => toggleFileSelection(file.path)}
										className={cn(
											"cursor-pointer border-border",
											lastScrolledFilePath === file.path && "bg-primary/10",
										)}
									>
										<TableCell
											className="px-3 py-1.5"
											onClick={(e) => e.stopPropagation()}
										>
											<Checkbox
												checked={isSelected}
												onCheckedChange={() =>
													toggleFileSelection(file.path)
												}
												aria-label={`Select ${file.path}`}
											/>
										</TableCell>
										<TableCell className="px-3 py-1.5 align-middle">
											<div className="flex min-w-0 items-center gap-2">
												<code className="text-xs">{file.path}</code>
												{dlRecord && (
													<Badge variant="secondary">downloaded</Badge>
												)}
											</div>
											{dlRecord && (
												<div className="text-muted-foreground mt-0.5 text-xs">
													{downloadStatusText(dlRecord)}
												</div>
											)}
										</TableCell>
										<TableCell className="px-3 py-1.5 text-right align-middle">
											<span className="text-muted-foreground tabular-nums">
												{formatSize(file.size)}
											</span>
										</TableCell>
										<TableCell className="px-3 py-1.5 align-middle">
											{file.quantizations.map((q) => (
												<Badge key={q} variant="outline" className="mr-1">
													{q}
												</Badge>
											))}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			</div>

			{/* Add to queue */}
			<div className="mt-4">
				<Button
					onClick={() => void handleAddToQueue()}
					disabled={selectedCount === 0}
					className="gap-1.5"
				>
					Add {selectedCount} file(s) to queue
				</Button>
			</div>
		</section>
	);
}
