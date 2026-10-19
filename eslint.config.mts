import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores, defineConfig } from "eslint/config";

export default defineConfig(
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"version-bump.mjs",
		"versions.json",
		"main.js",
		"package.json",
		"package-lock.json",
		"tsconfig.json",
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.mts", "manifest.json", "tests/*.mjs"],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: [".json"],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ["tests/*.mjs"],
		languageOptions: { globals: globals.node },
		rules: {
			// These run in Node, outside the Obsidian WebView.
			"obsidianmd/no-nodejs-modules": "off",
			"obsidianmd/no-global-this": "off",
			"obsidianmd/prefer-window-timers": "off",
		},
	},
);
