import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAppState } from "@/hooks/use-app-state";
import type { DownloadTask } from "@/types";

type TaskStatus = DownloadTask["status"];

const STATUS_VARIANT: Record<TaskStatus, "default" | "secondary" | "destructive" | "outline"> = {
	queued: "outline",
	downloading: "secondary",
	completed: "default",
	failed: "destructive",
};

export function QueueSection() {
	const { tasks } = useAppState();

	return (
		<section aria-labelledby="queue-heading" className="border-border bg-card mt-8 border p-5">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<h2 id="queue-heading" className="font-sans text-xl leading-7">
					Download Queue
				</h2>
				<p className="text-muted-foreground text-xs">{tasks.length} task(s)</p>
			</div>

			<div className="border-border overflow-hidden border">
				<div className="max-h-80 overflow-auto">
					<Table>
						<TableHeader className="sticky top-0 z-10">
							<TableRow className="border-border bg-muted hover:bg-muted">
								<TableHead className="border-border text-muted-foreground w-20 px-3 py-2 text-xs font-semibold tracking-wide uppercase">
									Task
								</TableHead>
								<TableHead className="border-border text-muted-foreground px-3 py-2 text-xs font-semibold tracking-wide uppercase">
									Repo
								</TableHead>
								<TableHead className="border-border text-muted-foreground px-3 py-2 text-xs font-semibold tracking-wide uppercase">
									File
								</TableHead>
								<TableHead className="border-border text-muted-foreground w-28 px-3 py-2 text-xs font-semibold tracking-wide uppercase">
									Status
								</TableHead>
								<TableHead className="border-border text-muted-foreground px-3 py-2 text-xs font-semibold tracking-wide uppercase">
									Message
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tasks.map((task) => (
								<TableRow key={task.task_id} className="border-border">
									<TableCell className="px-3 py-1.5">
										<code className="text-muted-foreground text-xs tabular-nums">
											{task.task_id.slice(0, 8)}
										</code>
									</TableCell>
									<TableCell className="px-3 py-1.5">
										<code>{task.repo_id}</code>
									</TableCell>
									<TableCell className="px-3 py-1.5">
										<code>{task.file_path}</code>
									</TableCell>
									<TableCell className="px-3 py-1.5">
										<Badge variant={STATUS_VARIANT[task.status]}>
											{task.status}
										</Badge>
									</TableCell>
									<TableCell className="px-3 py-1.5">
										<span className="text-muted-foreground block max-w-72 truncate text-xs">
											{task.message ?? ""}
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
