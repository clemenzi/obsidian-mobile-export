import type { App, TFile } from "obsidian";
import type { RenderOptions } from "takumi-pdf/no-init";
import type { ExportOptions } from "../exportOptions";
import { pdfDocumentCss } from "./documentCss";
import { loadPdfWasm } from "./wasmLoader";

type PdfOptions = Extract<ExportOptions, { type: "pdf" }>;
type PdfInit = (options: { module_or_path: ArrayBuffer }) => Promise<unknown>;
type PdfRender = (html: string, options?: RenderOptions) => Promise<Uint8Array>;

let rendererInitialization: Promise<void> | undefined;

async function initializePdfRenderer(app: App, init: PdfInit): Promise<void> {
	rendererInitialization ??= loadPdfWasm(app)
		.then((wasm) => init({ module_or_path: wasm }))
		.then(() => undefined)
		.catch((error: unknown) => {
			rendererInitialization = undefined;
			throw error;
		});

	await rendererInitialization;
}

export async function createPdfFile(
	html: string,
	file: TFile,
	options: PdfOptions,
	app: App,
	init: PdfInit,
	render: PdfRender,
): Promise<File> {
	await initializePdfRenderer(app, init);

	const title = options.includeTitle ? `<h1>${escapeHtml(file.basename)}</h1>` : "";
	const pdfHtml = `<html><body><main class="export-note">${title}${html}</main></body></html>`;
	const pdf = await render(pdfHtml, {
		size: options.pageSize,
		landscape: options.landscape,
		margin: options.margin,
		css: pdfDocumentCss(options.scale),
		metadata: { title: file.basename },
	});

	const bytes = Uint8Array.from(pdf);
	return new File([bytes.buffer], `${file.basename}.pdf`, { type: "application/pdf" });
}

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => {
		switch (character) {
			case "&":
				return "&amp;";
			case "<":
				return "&lt;";
			case ">":
				return "&gt;";
			case '"':
				return "&quot;";
			default:
				return "&#39;";
		}
	});
}
