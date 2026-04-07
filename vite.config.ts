import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

// https://vite.dev/config/
export default defineConfig({
	staged: {
		"*": "vp check --fix",
	},
	fmt: {
		printWidth: 100,
		tabWidth: 4,
		useTabs: true,
		semi: true,
		singleQuote: false,
		trailingComma: "all",
		sortImports: true,
		sortTailwindcss: true,
		sortPackageJson: true,
		ignorePatterns: ["docs/**"],
	},
	lint: { options: { typeAware: true, typeCheck: true }, ignorePatterns: ["docs/**"] },
	plugins: [react(), tailwindcss()],
	server: {
		proxy: {
			"/api": "http://localhost:8000",
		},
	},
});
