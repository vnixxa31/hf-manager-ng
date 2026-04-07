import { AppHeader } from "@/components/AppHeader";
import { DownloadsSection } from "@/components/DownloadsSection";
import { FilesSection } from "@/components/FilesSection";
import { QueueSection } from "@/components/QueueSection";
import { RepoSection } from "@/components/RepoSection";
import { AppStateProvider, useAppState } from "@/hooks/use-app-state";

function AppContent() {
	const { files, tasks, downloads } = useAppState();

	return (
		<div className="mx-auto max-w-270 px-6 py-12 pb-16 text-sm leading-6 transition-colors">
			<AppHeader />
			<RepoSection />
			{files.length > 0 && <FilesSection />}
			{tasks.length > 0 && <QueueSection />}
			{downloads.length > 0 && <DownloadsSection />}
		</div>
	);
}

export default function App() {
	return (
		<AppStateProvider>
			<AppContent />
		</AppStateProvider>
	);
}
