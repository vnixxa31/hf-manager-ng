import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ThemeProvider } from "@/components/theme-provider.tsx";

import "./index.css";
import { Toaster } from "@/components/ui/sonner";

import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ThemeProvider>
			<App />
			<Toaster />
		</ThemeProvider>
	</StrictMode>,
);
