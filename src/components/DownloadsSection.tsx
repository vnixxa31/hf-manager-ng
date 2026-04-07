import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatSize, formatFingerprint, formatTimestamp, shortHash } from "@/lib/format";
import type { DownloadRecord } from "@/types";

interface DownloadsSectionProps {
	downloads: DownloadRecord[];
}

export function DownloadsSection({ downloads }: DownloadsSectionProps) {
	return (
		<section className="border-border bg-card mt-8 border p-5">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="font-sans text-xl leading-7">Tracked Downloads</h2>
					<p className="text-muted-foreground mt-1 block text-xs">
						Durable inventory from SQLite, ordered by last successful download.
					</p>
				</div>
				<span className="text-muted-foreground text-xs">{downloads.length} file(s)</span>
			</div>

			<div className="border-border overflow-hidden border">
				<div className="max-h-90 overflow-auto">
					<Table>
						<TableHeader className="sticky top-0 z-10">
							<TableRow className="border-border bg-muted hover:bg-muted">
								<TableHead className="border-border text-muted-foreground px-3 py-2 text-xs font-semibold tracking-wide uppercase">
									Repo
								</TableHead>
								<TableHead className="border-border text-muted-foreground px-3 py-2 text-xs font-semibold tracking-wide uppercase">
									File
								</TableHead>
								<TableHead className="border-border text-muted-foreground w-24 px-3 py-2 text-right text-xs font-semibold tracking-wide uppercase">
									Size
								</TableHead>
								<TableHead className="border-border text-muted-foreground px-3 py-2 text-xs font-semibold tracking-wide uppercase">
									Fingerprint
								</TableHead>
								<TableHead className="border-border text-muted-foreground px-3 py-2 text-xs font-semibold tracking-wide uppercase">
									Last Download
								</TableHead>
								<TableHead className="border-border text-muted-foreground px-3 py-2 text-right text-xs font-semibold tracking-wide uppercase">
									Count
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{downloads.map((dl) => (
								<TableRow
									key={`${dl.repo_id}::${dl.file_path}`}
									className="border-border"
								>
									<TableCell className="px-3 py-1.5">
										<code>{dl.repo_id}</code>
									</TableCell>
									<TableCell className="px-3 py-1.5">
										<code>{dl.file_path}</code>
										<div>
											{dl.quantizations.map((q) => (
												<span
													key={q}
													className="border-primary text-muted-foreground mr-1 inline-block border-l-2 px-1.5 py-0.5 text-xs"
												>
													{q}
												</span>
											))}
										</div>
									</TableCell>
									<TableCell className="px-3 py-1.5 text-right">
										<span className="text-muted-foreground tabular-nums">
											{formatSize(dl.size_bytes)}
										</span>
									</TableCell>
									<TableCell className="px-3 py-1.5">
										<div className="text-muted-foreground text-xs">
											{formatFingerprint(dl)}
										</div>
										{dl.commit_hash && (
											<div className="text-muted-foreground text-xs">
												commit {shortHash(dl.commit_hash)}
											</div>
										)}
									</TableCell>
									<TableCell className="px-3 py-1.5">
										<span className="text-muted-foreground text-xs">
											{formatTimestamp(dl.last_downloaded_at)}
										</span>
									</TableCell>
									<TableCell className="px-3 py-1.5 text-right">
										<span className="text-muted-foreground text-xs tabular-nums">
											{dl.download_count}
										</span>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		</section>
	);
}
