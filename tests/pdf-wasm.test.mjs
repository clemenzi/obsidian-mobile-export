import assert from "node:assert/strict";
import { after, test } from "node:test";
import { readFile, writeFile, mkdir, mkdtemp, rm, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { getTakumiMetadata, wasmPath } from "../scripts/takumi-metadata.mjs";

const temporaryDirectory = await mkdtemp(join(tmpdir(), "mobile-export-test-"));
after(async () => {
	delete globalThis.__pdfTestRequest;
	await rm(temporaryDirectory, { recursive: true, force: true });
});
const define = await getTakumiMetadata();
const version = JSON.parse(define.__TAKUMI_VERSION__);
const wasm = Uint8Array.from(await readFile(wasmPath)).buffer;
const validButWrongWasm = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0).buffer;
const corrupt = Uint8Array.of(0, 97, 115).buffer;
const configDir = ".custom-obsidian";
const cachePath = `${configDir}/plugins/mobile-export/takumi-pdf-${version}.wasm`;
const url = `https://cdn.jsdelivr.net/npm/takumi-pdf@${version}/pkg/takumi_pdf_wasm_bg.wasm`;
const bundlePath = join(temporaryDirectory, "pdf.mjs");
await build({
	stdin: {
		contents: `export { loadPdfWasm } from "./src/utils/wasmLoader.ts";
export { createPdfFile } from "./src/utils/pdfExport.ts";
export { default as init, render } from "takumi-pdf/no-init";
export { DEFAULT_PDF_OPTIONS } from "./src/exportOptions.ts";`,
		resolveDir: process.cwd(),
	},
	bundle: true,
	format: "esm",
	platform: "browser",
	target: "es2021",
	loader: { ".woff2": "binary" },
	define,
	outfile: bundlePath,
	plugins: [
		{
			name: "mock-obsidian",
			setup(builder) {
				builder.onResolve({ filter: /^obsidian$/ }, () => ({
					path: "obsidian",
					namespace: "mock",
				}));
				builder.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
					contents:
						"export class App {} export const requestUrl = (options) => globalThis.__pdfTestRequest(options);",
				}));
			},
		},
	],
});
let session = 0;
const freshSession = () => import(`${pathToFileURL(bundlePath).href}?session=${session++}`);

function vault(initialCache, options = {}) {
	const files = new Map();
	if (initialCache) files.set(cachePath, initialCache.slice(0));
	const operations = [];
	const olderPath = `${configDir}/plugins/mobile-export/takumi-pdf-0.14.0.wasm`;
	files.set(olderPath, wasm.slice(0));
	const adapter = {
		async exists(path) {
			return files.has(path);
		},
		async readBinary(path) {
			if (path === cachePath && options.unreadable) throw new Error("Cannot read");
			if (path.endsWith(".tmp") && options.corruptWrite) return corrupt;
			return files.get(path).slice(0);
		},
		async writeBinary(path, data) {
			operations.push(["write", path]);
			if (options.partialWrite) {
				files.set(path, corrupt);
				throw new Error("Disk full");
			}
			files.set(path, data.slice(0));
		},
		async remove(path) {
			operations.push(["remove", path]);
			files.delete(path);
		},
		async rename(from, to) {
			operations.push(["rename", from, to]);
			if (options.renameFailure) throw new Error("Rename failed");
			assert.equal(files.has(to), false);
			files.set(to, files.get(from));
			files.delete(from);
		},
	};
	return { app: { vault: { configDir, adapter } }, files, operations, olderPath };
}

function network(response = wasm, status = 200) {
	const requests = [];
	globalThis.__pdfTestRequest = async (options) => {
		requests.push(options.url);
		if (response instanceof Error) throw response;
		return { status, arrayBuffer: response.slice(0) };
	};
	return requests;
}

test("build metadata matches the installed artifact", () => {
	assert.equal(
		JSON.parse(define.__TAKUMI_WASM_SHA256__),
		createHash("sha256").update(new Uint8Array(wasm)).digest("hex"),
	);
});

test("verified cache works offline without modifying any file", async () => {
	const { loadPdfWasm } = await freshSession();
	const state = vault(wasm);
	const requests = network(new Error("Offline"));
	assert.deepEqual(await loadPdfWasm(state.app), wasm);
	assert.deepEqual(requests, []);
	assert.deepEqual(state.operations, []);
});

for (const [name, cached, options] of [
	["missing", undefined, {}],
	["truncated", corrupt, {}],
	["valid but unexpected", validButWrongWasm, {}],
	["unreadable", wasm, { unreadable: true }],
]) {
	test(`${name} cache is repaired with the exact version; older versions survive`, async () => {
		const { loadPdfWasm } = await freshSession();
		const state = vault(cached, options);
		const requests = network();
		assert.deepEqual(await loadPdfWasm(state.app), wasm);
		assert.deepEqual(requests, [url]);
		assert.deepEqual(state.files.get(cachePath), wasm);
		assert.equal(state.files.has(`${cachePath}.tmp`), false);
		assert.equal(state.files.has(state.olderPath), true);
		const removal = state.operations.findIndex(([operation]) => operation === "remove");
		if (cached) assert.ok(removal > 0, "replacement must be staged before cache removal");
	});
}

for (const cached of [undefined, corrupt]) {
	test(`offline ${cached ? "repair" : "first use"} gives an actionable error and retries`, async () => {
		const { loadPdfWasm } = await freshSession();
		const state = vault(cached);
		network(new Error("Offline"));
		await assert.rejects(
			loadPdfWasm(state.app),
			/Connect to the internet.*cdn\.jsdelivr\.net.*export again/,
		);
		assert.deepEqual(state.operations, []);
		network();
		assert.deepEqual(await loadPdfWasm(state.app), wasm);
	});
}

for (const [name, response, status, message] of [
	["HTTP failure", wasm, 503, /could not be repaired/],
	["truncated download", corrupt, 200, /integrity check/],
	["unexpected module", validButWrongWasm, 200, /integrity check/],
]) {
	test(`${name} never modifies the existing cache and permits retry`, async () => {
		const { loadPdfWasm } = await freshSession();
		const state = vault(corrupt);
		network(response, status);
		await assert.rejects(loadPdfWasm(state.app), message);
		assert.deepEqual(state.files.get(cachePath), corrupt);
		assert.deepEqual(state.operations, []);
		network();
		assert.deepEqual(await loadPdfWasm(state.app), wasm);
	});
}

for (const options of [{ partialWrite: true }, { corruptWrite: true }, { renameFailure: true }]) {
	test(`storage failure ${JSON.stringify(options)} cleans temporary bytes and permits retry`, async () => {
		const { loadPdfWasm } = await freshSession();
		const state = vault(corrupt, options);
		network();
		await assert.rejects(loadPdfWasm(state.app), /Check vault storage and permissions/);
		assert.equal(state.files.has(`${cachePath}.tmp`), false);
		assert.equal(state.files.has(state.olderPath), true);
		if (!options.renameFailure) assert.deepEqual(state.files.get(cachePath), corrupt);
		Object.keys(options).forEach((key) => {
			options[key] = false;
		});
		assert.deepEqual(await loadPdfWasm(state.app), wasm);
	});
}

test("real JS + WASM renders a PDF and a new session renders from offline cache", async () => {
	const state = vault();
	const first = await freshSession();
	const requests = network();
	const file = { basename: "WASM integration" };
	const html = "<h2>PDF export</h2><p>Verified WASM renders this text.</p>";
	const pdf = await first.createPdfFile(
		html,
		file,
		first.DEFAULT_PDF_OPTIONS,
		state.app,
		first.init,
		first.render,
	);
	assert.equal(pdf.type, "application/pdf");
	assert.equal(pdf.name, "WASM integration.pdf");
	assert.ok(pdf.size > 1000);
	assert.equal((await pdf.text()).slice(0, 5), "%PDF-");
	assert.deepEqual(requests, [url]);

	const second = await freshSession();
	const offlineRequests = network(new Error("Offline"));
	const offlinePdf = await second.createPdfFile(
		html,
		file,
		second.DEFAULT_PDF_OPTIONS,
		state.app,
		second.init,
		second.render,
	);
	assert.equal((await offlinePdf.text()).slice(0, 5), "%PDF-");
	assert.deepEqual(offlineRequests, []);
});

test("PDF initialization resets after rejection and concurrent exports share initialization", async () => {
	const runtime = await freshSession();
	const state = vault();
	const file = { basename: "Retry" };
	network(new Error("Offline"));
	await assert.rejects(
		runtime.createPdfFile(
			"<p>Retry</p>",
			file,
			runtime.DEFAULT_PDF_OPTIONS,
			state.app,
			runtime.init,
			runtime.render,
		),
	);
	const requests = network();
	let attempts = 0;
	const init = async (options) => {
		attempts++;
		return runtime.init(options);
	};
	const results = await Promise.all(
		Array.from({ length: 3 }, () =>
			runtime.createPdfFile(
				"<p>Retry</p>",
				file,
				runtime.DEFAULT_PDF_OPTIONS,
				state.app,
				init,
				runtime.render,
			),
		),
	);
	assert.equal(attempts, 1);
	assert.deepEqual(requests, [url]);
	for (const pdf of results) assert.equal((await pdf.text()).slice(0, 5), "%PDF-");
});

test("a Takumi initialization rejection also permits retry with the healthy cache", async () => {
	const runtime = await freshSession();
	const state = vault(wasm);
	const requests = network(new Error("Offline"));
	const args = [
		"<p>Retry initialization</p>",
		{ basename: "Retry" },
		runtime.DEFAULT_PDF_OPTIONS,
		state.app,
	];
	await assert.rejects(
		runtime.createPdfFile(
			...args,
			async () => {
				throw new Error("Initialization failed");
			},
			runtime.render,
		),
		/Initialization failed/,
	);
	const pdf = await runtime.createPdfFile(...args, runtime.init, runtime.render);
	assert.equal((await pdf.text()).slice(0, 5), "%PDF-");
	assert.deepEqual(requests, []);
});

test("build rejects version ranges, mismatched installs, and invalid installed artifacts", async () => {
	const fixture = join(temporaryDirectory, "build-fixture");
	await mkdir(join(fixture, "scripts"), { recursive: true });
	const packageRoot = join(fixture, "node_modules/takumi-pdf");
	await mkdir(join(packageRoot, "pkg"), { recursive: true });
	await copyFile("scripts/takumi-metadata.mjs", join(fixture, "scripts/takumi-metadata.mjs"));
	await writeFile(
		join(packageRoot, "package.json"),
		JSON.stringify({
			version: "0.15.0",
			exports: { "./takumi_pdf_wasm_bg.wasm": "./pkg/test.wasm" },
		}),
	);
	await writeFile(join(packageRoot, "pkg/test.wasm"), new Uint8Array(validButWrongWasm));
	const metadata = await import(pathToFileURL(join(fixture, "scripts/takumi-metadata.mjs")).href);
	for (const dependency of ["^0.15.0", "~0.15.0", "latest", "0.16.0"]) {
		await writeFile(
			join(fixture, "package.json"),
			JSON.stringify({ dependencies: { "takumi-pdf": dependency } }),
		);
		await assert.rejects(metadata.getTakumiMetadata(), /Pin takumi-pdf to an exact version/);
	}
	await writeFile(
		join(fixture, "package.json"),
		JSON.stringify({ dependencies: { "takumi-pdf": "0.15.0" } }),
	);
	assert.equal(JSON.parse((await metadata.getTakumiMetadata()).__TAKUMI_VERSION__), "0.15.0");
	await writeFile(join(packageRoot, "pkg/test.wasm"), new Uint8Array(corrupt));
	await assert.rejects(metadata.getTakumiMetadata(), /installed Takumi PDF WASM is invalid/);
});
