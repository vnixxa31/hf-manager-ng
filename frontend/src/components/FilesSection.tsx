import { useEffect, useRef } from "react"
import { MagnifyingGlass } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { HFFile, DownloadRecord, DownloadFilter } from "@/types"
import { formatSize, downloadStatusText } from "@/lib/format"

interface FilesSectionProps {
  files: HFFile[]
  filteredFiles: HFFile[]
  quantTags: string[]
  activeQuant: string | null
  searchQuery: string
  downloadFilter: DownloadFilter
  currentRepoDownloadsByPath: Record<string, DownloadRecord>
  lastScrolledFilePath: string | null
  onSearchChange: (q: string) => void
  onDownloadFilterToggle: (mode: "downloaded" | "not_downloaded") => void
  onSelectVisible: () => void
  onClearSelection: () => void
  onToggleQuant: (q: string) => void
  onToggleFileSelection: (path: string) => void
  onToggleAll: (checked: boolean) => void
  onAddToQueue: () => void
}

export function FilesSection({
  files,
  filteredFiles,
  quantTags,
  activeQuant,
  searchQuery,
  downloadFilter,
  currentRepoDownloadsByPath,
  lastScrolledFilePath,
  onSearchChange,
  onDownloadFilterToggle,
  onSelectVisible,
  onClearSelection,
  onToggleQuant,
  onToggleFileSelection,
  onToggleAll,
  onAddToQueue,
}: FilesSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const selectedCount = files.filter((f) => f.selected).length
  const selectedSize = files
    .filter((f) => f.selected)
    .reduce((sum, f) => sum + (f.size || 0), 0)
  const allVisibleSelected =
    filteredFiles.length > 0 && filteredFiles.every((f) => f.selected)

  useEffect(() => {
    if (!lastScrolledFilePath || !scrollRef.current) return
    const selector = `[data-file-path="${CSS.escape(lastScrolledFilePath)}"]`
    const row = scrollRef.current.querySelector(selector)
    row?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [lastScrolledFilePath])

  return (
    <section className="mt-8 border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-sans text-xl leading-7">
          Files{" "}
          <span className="font-mono text-xs text-muted-foreground">
            ({filteredFiles.length}/{files.length})
          </span>
        </h2>
        <span className="text-xs text-muted-foreground">
          {selectedCount} selected — {formatSize(selectedSize)}
        </span>
      </div>

      {/* Filters row */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-50 flex-1">
          <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            type="text"
            placeholder="Filter filenames..."
            className="h-9 w-full rounded-none border border-input bg-transparent py-2 pr-3 pl-8 text-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={downloadFilter === "downloaded" ? "default" : "outline"}
            size="sm"
            onClick={() => onDownloadFilterToggle("downloaded")}
          >
            Downloaded
          </Button>
          <Button
            variant={
              downloadFilter === "not_downloaded" ? "default" : "outline"
            }
            size="sm"
            onClick={() => onDownloadFilterToggle("not_downloaded")}
          >
            Not Downloaded
          </Button>
          <Button variant="outline" size="sm" onClick={onSelectVisible}>
            Select Visible
          </Button>
          <Button variant="outline" size="sm" onClick={onClearSelection}>
            Clear
          </Button>
        </div>
      </div>

      {/* Quant chips */}
      {quantTags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {quantTags.map((q) => (
            <button
              key={q}
              onClick={() => onToggleQuant(q)}
              className={cn(
                "border px-2.5 py-1 text-xs font-medium transition-colors",
                activeQuant === q
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* File table */}
      <div className="overflow-hidden border border-border">
        <div ref={scrollRef} className="max-h-[420px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="border-border bg-muted hover:bg-muted">
                <TableHead className="w-10 border-border px-3 py-2">
                  <input
                    type="checkbox"
                    className="size-3.5 accent-primary"
                    checked={allVisibleSelected}
                    onChange={(e) => onToggleAll(e.target.checked)}
                  />
                </TableHead>
                <TableHead className="border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  File
                </TableHead>
                <TableHead className="w-24 border-border px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Size
                </TableHead>
                <TableHead className="w-36 border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Quant
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.map((file) => {
                const dlRecord = currentRepoDownloadsByPath[file.path]
                return (
                  <TableRow
                    key={file.path}
                    data-file-path={file.path}
                    onClick={() => onToggleFileSelection(file.path)}
                    className={cn(
                      "cursor-pointer border-border",
                      lastScrolledFilePath === file.path && "bg-primary/10",
                    )}
                  >
                    <TableCell
                      className="px-3 py-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="size-3.5 accent-primary"
                        checked={file.selected}
                        onChange={() => onToggleFileSelection(file.path)}
                      />
                    </TableCell>
                    <TableCell className="px-3 py-1.5 align-middle">
                      <div className="flex min-w-0 items-center gap-2">
                        <code className="text-xs">{file.path}</code>
                        {dlRecord && (
                          <Badge
                            variant="outline"
                            className="border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          >
                            downloaded
                          </Badge>
                        )}
                      </div>
                      {dlRecord && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {downloadStatusText(dlRecord)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-right align-middle">
                      <span className="tabular-nums text-muted-foreground">
                        {formatSize(file.size)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-1.5 align-middle">
                      {file.quantizations.map((q) => (
                        <span
                          key={q}
                          className="mr-1 inline-block border-l-2 border-primary px-1.5 py-0.5 text-xs text-muted-foreground"
                        >
                          {q}
                        </span>
                      ))}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add to queue */}
      <div className="mt-4">
        <Button
          onClick={onAddToQueue}
          disabled={selectedCount === 0}
          className="gap-1.5"
        >
          Add {selectedCount} file(s) to queue
        </Button>
      </div>
    </section>
  )
}
