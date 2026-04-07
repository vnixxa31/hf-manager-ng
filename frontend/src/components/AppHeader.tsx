import { SunIcon, MoonIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

interface AppHeaderProps {
  polling: boolean
}

function getIsDark(theme: string): boolean {
  if (theme === "dark") return true
  if (theme === "light") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function AppHeader({ polling }: AppHeaderProps) {
  const { theme, setTheme } = useTheme()
  const isDark = getIsDark(theme)

  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        <h1 className="font-sans text-3xl leading-9 tracking-tight">
          HF Model Downloader
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Browse repos. Select quantizations. Queue downloads.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              "size-1.5 rounded-full",
              polling
                ? "animate-pulse bg-emerald-500"
                : "bg-muted-foreground/40",
            )}
          />
          {polling ? "polling" : "idle"}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </Button>
      </div>
    </header>
  )
}
