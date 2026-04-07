import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface RepoSectionProps {
  repoInput: string
  tokenInput: string
  loading: boolean
  statusMsg: string
  error: boolean
  onRepoInputChange: (value: string) => void
  onTokenInputChange: (value: string) => void
  onLoadFiles: () => void
}

export function RepoSection({
  repoInput,
  tokenInput,
  loading,
  statusMsg,
  error,
  onRepoInputChange,
  onTokenInputChange,
  onLoadFiles,
}: RepoSectionProps) {
  return (
    <section className="border border-border bg-card p-5">
      <div className="flex flex-wrap gap-2">
        <Input
          value={repoInput}
          onChange={(e) => onRepoInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onLoadFiles()}
          type="text"
          placeholder="owner/model or full HF URL"
          className="h-9 min-w-50 flex-1 py-2"
        />
        <Input
          value={tokenInput}
          onChange={(e) => onTokenInputChange(e.target.value)}
          type="password"
          placeholder="HF token (optional)"
          className="h-9 w-52 py-2 max-sm:w-full"
        />
        <Button
          onClick={onLoadFiles}
          disabled={loading}
          className="h-9 gap-1.5 px-4"
        >
          {loading ? (
            <>
              <span className="size-3.5 animate-spin rounded-full border-2 border-transparent border-t-current border-r-current" />
              Loading
            </>
          ) : (
            "Load Files"
          )}
        </Button>
      </div>

      <p
        className={cn(
          "mt-3 text-xs",
          error ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {statusMsg}
      </p>
    </section>
  )
}
