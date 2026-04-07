import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DownloadTask } from "@/types"

interface QueueSectionProps {
  tasks: DownloadTask[]
}

const STATUS_CLASSES: Record<
  DownloadTask["status"],
  { text: string; dot: string }
> = {
  queued: {
    text: "text-amber-600",
    dot: "bg-amber-600",
  },
  downloading: {
    text: "text-blue-600",
    dot: "animate-pulse bg-blue-600",
  },
  completed: {
    text: "text-emerald-600",
    dot: "bg-emerald-600",
  },
  failed: {
    text: "text-destructive",
    dot: "bg-destructive",
  },
}

export function QueueSection({ tasks }: QueueSectionProps) {
  return (
    <section className="mt-8 border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-sans text-xl leading-7">Download Queue</h2>
        <span className="text-xs text-muted-foreground">
          {tasks.length} task(s)
        </span>
      </div>

      <div className="overflow-hidden border border-border">
        <div className="max-h-80 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="border-border bg-muted hover:bg-muted">
                <TableHead className="w-20 border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Task
                </TableHead>
                <TableHead className="border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Repo
                </TableHead>
                <TableHead className="border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  File
                </TableHead>
                <TableHead className="w-28 border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Message
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const style = STATUS_CLASSES[task.status]
                return (
                  <TableRow key={task.task_id} className="border-border">
                    <TableCell className="px-3 py-1.5">
                      <code className="tabular-nums text-xs text-muted-foreground">
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
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs",
                          style.text,
                        )}
                      >
                        <span
                          className={cn("size-1.5 rounded-full", style.dot)}
                        />
                        {task.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-1.5">
                      <span className="block max-w-72 truncate text-xs text-muted-foreground">
                        {task.message ?? ""}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  )
}
