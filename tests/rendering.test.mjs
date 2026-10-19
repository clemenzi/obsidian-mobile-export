import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { importTestBundle } from "./bundle.mjs";
import { unzipSync, strFromU8 } from "fflate";

const api = await importTestBundle({
	stdin: {
		contents: `export { prepareBulkExport } from "./src/utils/bulkExport"; export { DEFAULT_PDF_OPTIONS } from "./src/exportOptions"; export * from "obsidian";`,
		resolveDir: process.cwd(),
	},
	bundle: true,
	write: false,
	format: "esm",
	platform: "node",
	loader: { ".woff2": "binary" },
	plugins: [
		{
			name: "offline-obsidian-host",
			setup(builder) {
				builder.onResolve({ filter: /^obsidian$/ }, () => ({
					path: "obsidian",
					namespace: "test",
				}));
				builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({
					contents: `
					export class TFile { constructor(path) { this.path = path; this.basename = path.split("/").pop().slice(0, -3); this.extension = "md"; } }
					export class TFolder {}
					export const Platform = { isMobile: false };
					export const requestUrl = () => { throw new Error("Network requests are forbidden in the offline rendering test"); };
				`,
				}));
			},
		},
	],
});
const { prepareBulkExport, DEFAULT_PDF_OPTIONS, TFile } = api;
globalThis.window = globalThis;

test("real HTML and PDF batch rendering works offline with cached WASM and shared PDF options", async () => {
	const wasm = await readFile(new URL("../takumi-pdf-0.15.0.wasm", import.meta.url));
	const files = [new TFile("Course/Plato.md"), new TFile("Course/Sub/Aristotle.md")];
	let wasmReads = 0;
	const app = {
		vault: {
			configDir: ".test-config",
			getAbstractFileByPath: (path) => files.find((file) => file.path === path),
			read: async () => "# Philosophy\n\n**Bold**, *italic*, inline $x^2$.\n\n- First\n- Second",
			adapter: {
				exists: async () => true,
				readBinary: async () => {
					wasmReads++;
					return Uint8Array.from(wasm).buffer;
				},
			},
		},
	};
	for (const type of ["html", "pdf"]) {
		const options =
			type === "html"
				? { type }
				: {
						...DEFAULT_PDF_OPTIONS,
						includeTitle: true,
						pageSize: "a4",
						landscape: true,
						margin: 10,
						scale: 80,
					};
		const report = await prepareBulkExport(
			app,
			files,
			files,
			options,
			"zip",
			"Course.zip",
			() => {},
			new AbortController().signal,
		);
		assert.deepEqual(report.failures, []);
		assert.equal(report.succeeded, 2);
		const entries = unzipSync(new Uint8Array(await report.result.archive.arrayBuffer()));
		assert.deepEqual(Object.keys(entries), [
			`Course/Plato.${type}`,
			`Course/Sub/Aristotle.${type}`,
		]);
		for (const bytes of Object.values(entries)) {
			if (type === "html") {
				const html = strFromU8(bytes);
				assert.match(html, /<strong>Bold<\/strong>/);
				assert.match(html, /<em>italic<\/em>/);
				assert.match(html, /data:image\/svg\+xml,/);
			} else {
				assert.equal(strFromU8(bytes.slice(0, 5)), "%PDF-");
				assert.ok(bytes.length > 1000);
			}
		}
	}
	assert.equal(wasmReads, 1, "reuse the WASM renderer for sequential PDFs");
});
