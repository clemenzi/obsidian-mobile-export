import assert from "node:assert/strict";
import { test } from "node:test";
import { importTestBundle } from "./bundle.mjs";
import { unzipSync, strFromU8 } from "fflate";

// Bundle the real browser modules against a small Obsidian host and renderer stub.
// Production rendering stays in createExportFile; tests can inject read/render failures.
const host = `
export class Element {
 children = []; hidden = false; style = {}; text = "";
 createEl(tag, options = {}) { const el = new Element(); el.tag = tag; el.text = options.text; this.children.push(el); return el; }
 createDiv(options) { return this.createEl("div", options); }
 empty() { this.children = []; this.text = ""; }
 setText(text) { this.text = text; }
 addClass() {}
}
export class TAbstractFile { constructor(path) { this.path = path; this.name = path.split("/").pop(); } }
export class TFile extends TAbstractFile {
 constructor(path) { super(path); this.basename = this.name.replace(/\\.[^.]+$/, ""); this.extension = this.name.split(".").pop(); }
}
export class TFolder extends TAbstractFile {
 children = [];
 constructor(path, children = []) { super(path); this.children = children; for (const child of children) child.parent = this; }
}
export const Platform = { isMobile: false };
export const notices = [];
export class Notice { constructor(text) { notices.push(text); } }
export class Modal {
 contentEl = new Element(); modalEl = new Element();
 constructor(app) { this.app = app; }
 setTitle(text) { this.title = text; }
 open() { this.onOpen(); }
 close() { this.onClose(); }
}
class Control {
 buttonEl = new Element(); disabled = false;
 setButtonText(text) { this.text = text; return this; }
 setCta() { return this; }
 setDisabled(value) { this.disabled = value; return this; }
 onClick(callback) { this.click = callback; return this; }
 onChange(callback) { this.change = callback; return this; }
 addOption() { return this; }
 setValue(value) { this.value = value; return this; }
 setLimits() { return this; }
}
export class Setting {
 constructor(container) { this.controlEl = container.createDiv(); }
 setName(name) { this.name = name; return this; }
 setDesc() { return this; }
 addButton(callback) { callback(new Control()); return this; }
 addDropdown(callback) { callback(new Control()); return this; }
 addToggle(callback) { callback(new Control()); return this; }
 addSlider(callback) { callback(new Control()); return this; }
}
export const getLanguage = () => "en";
`;
const renderer = `
export let render = async (markdown, app, file, options) => new File([markdown], file.basename + "." + options.type, { type: options.type === "pdf" ? "application/pdf" : "text/html" });
export const setRenderer = (callback) => { render = callback; };
export const createExportFile = (...args) => render(...args);
export const downloads = [];
export const deliverExportFile = async (file) => downloads.push(file);
`;
const api = await importTestBundle({
	stdin: {
		contents: `export * from "./src/utils/exportTargets"; export * from "./src/utils/bulkExport"; export * from "./src/utils/share"; export * from "./src/ui/BulkExportModal"; export * from "./src/ui/ExportModal"; export * from "./src/commands/registerExportMenus"; export * from "obsidian"; export * from "test-renderer";`,
		resolveDir: process.cwd(),
	},
	bundle: true,
	write: false,
	format: "esm",
	platform: "browser",
	plugins: [
		{
			name: "test-host",
			setup(builder) {
				builder.onResolve({ filter: /^obsidian$/ }, () => ({
					path: "obsidian",
					namespace: "test",
				}));
				builder.onResolve({ filter: /^(test-renderer|\.\.\/utils\/export|\.\/export)$/ }, () => ({
					path: "renderer",
					namespace: "test",
				}));
				builder.onLoad({ filter: /.*/, namespace: "test" }, (args) => ({
					contents: args.path === "obsidian" ? host : renderer,
				}));
			},
		},
	],
});

const {
	TFile,
	TFolder,
	collectMarkdownFiles,
	archivePath,
	prepareBulkExport,
	setRenderer,
	BulkExportModal,
	Platform,
	supportsMultipleFiles,
	shareFiles,
} = api;
globalThis.window = globalThis;
const navigator = {};
Object.defineProperty(globalThis, "navigator", { value: navigator, configurable: true });
const defaultRenderer = async (markdown, _app, file, options) =>
	new File([markdown], `${file.basename}.${options.type}`);

function vault(files, read = async (file) => file.path) {
	return {
		vault: { read, getAbstractFileByPath: (path) => files.find((file) => file.path === path) },
	};
}
function prepare(files, overrides = {}) {
	const {
		app = vault(files),
		mode = "zip",
		signal = new AbortController().signal,
		targets = files,
		progress = () => {},
		type = "html",
	} = overrides;
	return prepareBulkExport(app, files, targets, { type }, mode, "Notes.zip", progress, signal);
}

test("collection respects recursion, explicit nested notes, overlap, case and sorting", () => {
	const nested = new TFile("Course/Sub/Ética.md");
	const a = new TFile("Course/a.md");
	const upper = new TFile("Course/A.MD");
	const folder = new TFolder("Course", [
		a,
		new TFolder("Course/Sub", [nested]),
		upper,
		new TFile("Course/image.png"),
	]);
	assert.deepEqual(collectMarkdownFiles([folder], false), [upper, a]);
	assert.deepEqual(collectMarkdownFiles([folder, nested, a], true), [upper, nested, a]);
	assert.deepEqual(collectMarkdownFiles([folder, nested], false), [upper, nested, a]);
	assert.deepEqual(collectMarkdownFiles([new TFolder("Empty")], true), []);
});

test("ZIP paths retain the selected folder or vault context and reject unsafe entries", () => {
	const note = new TFile("Courses/Philosophy/Sub/Plato.md");
	const folder = new TFolder("Courses/Philosophy", [new TFolder("Courses/Philosophy/Sub", [note])]);
	new TFolder("Courses", [folder]);
	assert.equal(archivePath(note, [folder], "pdf"), "Philosophy/Sub/Plato.pdf");
	assert.equal(archivePath(note, [folder, note], "html"), "Courses/Philosophy/Sub/Plato.html");
	for (const path of [
		"/absolute.md",
		"../secret.md",
		"A/../secret.md",
		"C:/secret.md",
		"A//x.md",
		"A/./x.md",
		"A/\0.md",
		"A/..\\secret.md",
	]) {
		assert.throws(() => archivePath(new TFile(path), [], "pdf"), /Unsafe/);
	}
});

test("sequential large batches preserve Unicode paths and duplicate basenames in ZIP", async () => {
	let active = 0;
	let peak = 0;
	const optionsSeen = [];
	setRenderer(async (markdown, app, file, options) => {
		active++;
		peak = Math.max(active, peak);
		optionsSeen.push(options);
		await new Promise((resolve) => setTimeout(resolve, 1));
		active--;
		return defaultRenderer(markdown, app, file, options);
	});
	const files = Array.from({ length: 100 }, (_, index) => new TFile(`Course ${index}/Ética.md`));
	const progress = [];
	const report = await prepare(files, { type: "pdf", progress: (value) => progress.push(value) });
	assert.equal(peak, 1);
	assert.equal(report.succeeded, 100);
	assert.deepEqual(report.failures, []);
	const entries = unzipSync(new Uint8Array(await report.result.archive.arrayBuffer()));
	assert.equal(Object.keys(entries).length, 100);
	assert.equal(strFromU8(entries["Course 99/Ética.pdf"]), "Course 99/Ética.md");
	assert.equal(progress.at(-1).completed, 100);
	assert.ok(optionsSeen.every((options) => options.type === "pdf"));
});

test("partial failures retain successful HTML outputs; every failure and empty input have no deliverable", async () => {
	setRenderer(defaultRenderer);
	const files = [new TFile("A.md"), new TFile("B.md"), new TFile("C.md")];
	const app = vault(files, async (file) => {
		if (file === files[1]) throw new Error("Unreadable note");
		return file.path;
	});
	const report = await prepare(files, { app, mode: "share-files" });
	assert.equal(report.succeeded, 2);
	assert.deepEqual(
		report.result.files.map((file) => file.name),
		["A.html", "C.html"],
	);
	assert.deepEqual(report.failures, [{ path: "B.md", reason: "Unreadable note" }]);
	setRenderer(() => {
		throw new Error("Rendering failed");
	});
	const failed = await prepare(files);
	assert.equal(failed.result, null);
	assert.equal(failed.failures.length, 3);
	assert.equal((await prepare([])).result, null);
	setRenderer(defaultRenderer);
});

test("deleted notes and colliding normalized paths are reported without overwriting ZIP entries", async () => {
	const files = [new TFile("A/X.md"), new TFile("A/X.MD"), new TFile("Missing.md")];
	const report = await prepare(files, { app: vault(files.slice(0, 2)) });
	assert.equal(report.succeeded, 1);
	assert.equal(report.failures.length, 2);
	const entries = unzipSync(new Uint8Array(await report.result.archive.arrayBuffer()));
	assert.deepEqual(Object.keys(entries), ["A/X.html"]);
});

test("cancellation during a render discards the batch and never starts another document", async () => {
	const controller = new AbortController();
	let rendered = 0;
	setRenderer(async (...args) => {
		rendered++;
		controller.abort();
		return defaultRenderer(...args);
	});
	await assert.rejects(
		prepare([new TFile("A.md"), new TFile("B.md")], { signal: controller.signal }),
		{ name: "AbortError" },
	);
	assert.equal(rendered, 1);
	await assert.rejects(prepare([new TFile("A.md")], { signal: controller.signal }), {
		name: "AbortError",
	});
	setRenderer(defaultRenderer);
});

test("multi-file capability requires actual canShare support and final sharing rechecks the payload", async () => {
	assert.equal(supportsMultipleFiles("pdf"), false);
	navigator.share = async () => {};
	assert.equal(supportsMultipleFiles("pdf"), false);
	navigator.canShare = ({ files }) => files.every((file) => file.type === "application/pdf");
	assert.equal(supportsMultipleFiles("pdf"), true);
	assert.equal(supportsMultipleFiles("html"), false);
	navigator.canShare = () => {
		throw new Error("Unsupported");
	};
	assert.equal(supportsMultipleFiles("pdf"), false);
	await assert.rejects(shareFiles([new File(["test"], "A.pdf")], "Notes"), /not supported/);
});

test("desktop modal prepares one ZIP and waits for a separate delivery click", async () => {
	Platform.isMobile = false;
	const files = [new TFile("Folder/A.md"), new TFile("Folder/B.md")];
	const folder = new TFolder("Folder", files);
	const modal = new BulkExportModal(vault(files), [folder]);
	modal.open();
	assert.equal(modal.deliverySetting, undefined);
	await modal.prepare();
	assert.equal(modal.prepared.mode, "zip");
	assert.equal(modal.prepared.archive.name, "Folder.zip");
	assert.equal(api.downloads.length, 0);
	await modal.deliver();
	assert.equal(api.downloads.length, 1);
	assert.equal(modal.prepared, undefined);
});

test("mobile sharing runs synchronously from delivery, can be cancelled and retried", async () => {
	Platform.isMobile = true;
	navigator.canShare = () => true;
	let calls = 0;
	navigator.share = () => {
		calls++;
		return Promise.reject(new DOMException("Cancelled", "AbortError"));
	};
	const files = [new TFile("A.md"), new TFile("B.md")];
	const modal = new BulkExportModal(vault(files), files);
	modal.open();
	modal.mode = "share-files";
	await modal.prepare();
	assert.equal(calls, 0);
	const delivery = modal.deliver();
	assert.equal(calls, 1);
	await delivery;
	assert.ok(modal.prepared);
	assert.deepEqual(api.notices, []);
	navigator.share = async () => {
		calls++;
	};
	await modal.deliver();
	assert.equal(calls, 2);
	assert.equal(modal.prepared, undefined);
});

test("closing or unloading during preparation prevents stale results", async () => {
	Platform.isMobile = false;
	let complete;
	let started;
	const startedPromise = new Promise((resolve) => {
		started = resolve;
	});
	setRenderer(async (...args) => {
		started();
		await new Promise((resolve) => {
			complete = resolve;
		});
		return defaultRenderer(...args);
	});
	const files = [new TFile("A.md"), new TFile("B.md")];
	const modal = new BulkExportModal(vault(files), files);
	modal.open();
	const preparation = modal.prepare();
	await startedPromise;
	modal.close();
	complete();
	await preparation;
	assert.equal(modal.prepared, undefined);
	assert.equal(modal.contentEl.children.length, 0);
	setRenderer(defaultRenderer);
});

test("menus register folder and multiple selection exports and preserve single-note export", () => {
	const events = {};
	const cleanups = [];
	const plugin = {
		settings: { enableOnDesktop: true },
		app: {
			...vault([]),
			workspace: {
				on: (name, callback) => {
					events[name] = callback;
					return {};
				},
			},
		},
		registerEvent: () => {},
		register: (cleanup) => cleanups.push(cleanup),
		addCommand: () => {},
	};
	api.registerExportMenus(plugin);
	const items = [];
	const menu = {
		addItem(callback) {
			const item = {
				setTitle() {
					return this;
				},
				setIcon() {
					return this;
				},
				onClick(callback) {
					this.click = callback;
					return this;
				},
			};
			callback(item);
			items.push(item);
		},
	};
	events["file-menu"](menu, new TFolder("Folder"));
	events["files-menu"](menu, [new TFile("A.md"), new TFolder("Folder")]);
	events["file-menu"](menu, new TFile("Note.md"));
	events["file-menu"](menu, new TFile("image.png"));
	assert.equal(items.length, 3);
	for (const item of items) item.click();
	assert.equal(cleanups.length, 3);
	for (const cleanup of cleanups) cleanup();
	plugin.settings.enableOnDesktop = false;
	events["file-menu"](menu, new TFolder("Folder"));
	assert.equal(items.length, 3);
});
