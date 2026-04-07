import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/hooks/use-app-state";
import { cn } from "@/lib/utils";

export function RepoSection() {
	const {
		repoInput,
		tokenInput,
		loading,
		statusMsg,
		error,
		setRepoInput,
		setTokenInput,
		handleLoadFiles,
	} = useAppState();

	return (
		<section aria-labelledby="repo-heading" className="border-border bg-card border p-5">
			<h2 id="repo-heading" className="sr-only">
				Repository Input
			</h2>

			<div className="flex flex-wrap gap-2" role="search">
				<label className="sr-only" htmlFor="repo-input">
					Repository
				</label>
				<Input
					id="repo-input"
					value={repoInput}
					onChange={(e) => setRepoInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") void handleLoadFiles();
					}}
					type="text"
					placeholder="owner/model or full HF URL"
					className="h-9 min-w-50 flex-1 py-2"
				/>

				<label className="sr-only" htmlFor="token-input">
					HuggingFace Token
				</label>
				<Input
					id="token-input"
					value={tokenInput}
					onChange={(e) => setTokenInput(e.target.value)}
					type="password"
					autoComplete="off"
					placeholder="HF token (optional)"
					className="h-9 w-52 py-2 max-sm:w-full"
				/>

				<Button
					onClick={() => void handleLoadFiles()}
					disabled={loading}
					className="h-9 gap-1.5 px-4"
				>
					{loading ? (
						<>
							<span
								aria-hidden="true"
								className="size-3.5 animate-spin rounded-full border-2 border-transparent border-t-current border-r-current"
							/>
							Loading
						</>
					) : (
						"Load Files"
					)}
				</Button>
			</div>

			<p
				className={cn("mt-3 text-xs", error ? "text-destructive" : "text-muted-foreground")}
				role="status"
				aria-live="polite"
			>
				{statusMsg}
			</p>
		</section>
	);
}
