import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import tseslint from "typescript-eslint";
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
				__TAKUMI_VERSION__: "readonly",
				__TAKUMI_WASM_SHA256__: "readonly",
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.mts", "manifest.json"],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: [".json"],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		...tseslint.configs.disableTypeChecked,
		files: ["scripts/**/*.mjs", "tests/**/*.mjs"],
		rules: {
			...tseslint.configs.disableTypeChecked.rules,
			// Build tooling and tests run in Node, outside the Obsidian runtime.
			"obsidianmd/no-nodejs-modules": "off",
			"obsidianmd/no-global-this": "off",
			"no-unsanitized/method": "off",
		},
		languageOptions: {
			globals: globals.node,
			parserOptions: { projectService: false, project: false },
		},
	},
);
