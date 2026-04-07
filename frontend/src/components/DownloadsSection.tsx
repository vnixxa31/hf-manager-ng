import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DownloadRecord } from "@/types"
import {
  formatSize,
  formatFingerprint,
  formatTimestamp,
  shortHash,
} from "@/lib/format"

interface DownloadsSectionProps {
  downloads: DownloadRecord[]
}

export function DownloadsSection({ downloads }: DownloadsSectionProps) {
  return (
    <section className="mt-8 border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-sans text-xl leading-7">Tracked Downloads</h2>
          <span className="mt-1 block text-xs text-muted-foreground">
            Durable inventory from SQLite, ordered by last successful download.
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {downloads.length} file(s)
        </span>
      </div>

      <div className="overflow-hidden border border-border">
        <div className="max-h-90 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="border-border bg-muted hover:bg-muted">
                <TableHead className="border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Repo
                </TableHead>
                <TableHead className="border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  File
                </TableHead>
                <TableHead className="w-24 border-border px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Size
                </TableHead>
                <TableHead className="border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Fingerprint
                </TableHead>
                <TableHead className="border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Last Download
                </TableHead>
                <TableHead className="border-border px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    <div>
                      <code>{dl.file_path}</code>
                    </div>
                    <div
                      className="max-w-72 truncate text-xs text-muted-foreground"
                      title={dl.local_path}
                    >
                      {dl.local_path}
                    </div>
                    <div>
                      {dl.quantizations.map((q) => (
                        <span
                          key={q}
                          className="mr-1 inline-block border-l-2 border-primary px-1.5 py-0.5 text-xs text-muted-foreground"
                        >
                          {q}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-right">
                    <span className="tabular-nums text-muted-foreground">
                      {formatSize(dl.size_bytes)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-1.5">
                    <div className="text-xs text-muted-foreground">
                      {formatFingerprint(dl)}
                    </div>
                    {dl.commit_hash && (
                      <div className="text-xs text-muted-foreground">
                        commit {shortHash(dl.commit_hash)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-1.5">
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(dl.last_downloaded_at)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-right">
                    <span className="tabular-nums text-xs text-muted-foreground">
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
  )
}
