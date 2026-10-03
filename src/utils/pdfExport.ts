import type { App, TFile } from "obsidian";
import type { RenderOptions } from "takumi-pdf/no-init";
import type { ExportOptions } from "../exportOptions";
import interRegular from "@fontsource/inter/files/inter-latin-400-normal.woff2";
import interBold from "@fontsource/inter/files/inter-latin-700-normal.woff2";
import interItalic from "@fontsource/inter/files/inter-latin-400-italic.woff2";
import interBoldItalic from "@fontsource/inter/files/inter-latin-700-italic.woff2";
import emojiFont from "@fontsource/noto-emoji/files/noto-emoji-2-400-normal.woff2";
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
		// Latin text must use a matching face before the emoji fallback: using
		// Noto Emoji alone also selects its unusually wide space glyph in Takumi.
		fonts: [
			{ name: "Inter", data: interRegular },
			{ name: "Inter", weight: 700, data: interBold },
			// Use real italic faces instead of the renderer's synthetic slant.
			{ name: "Inter", style: "italic", data: interItalic },
			{ name: "Inter", weight: 700, style: "italic", data: interBoldItalic },
			{ name: "Noto Emoji", data: emojiFont },
		],
		fontFamilies: ["Inter", "Noto Emoji"],
		// Remaining unsupported glyphs should not prevent the whole PDF export.
		uncoveredText: "placeholder",
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
