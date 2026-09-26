import { App, Platform, TFile } from "obsidian";
import { marked } from "marked";
import init, { render } from "takumi-pdf/no-init";
import { loadPdfWasm } from "./pdfWasm";
import { HTML_DOCUMENT_CSS, pdfDocumentCss } from "./documentStyle";
import type { ExportOptions } from "../exportOptions";

let pdfRendererInitialization: Promise<void> | undefined;

async function initializePdfRenderer(app: App): Promise<void> {
	pdfRendererInitialization ??= loadPdfWasm(app)
		.then((wasm) => init({ module_or_path: wasm }))
		.then(() => undefined)
		.catch((error: unknown) => {
			pdfRendererInitialization = undefined;
			throw error;
		});
	await pdfRendererInitialization;
}

export async function createExportFile(
	markdown: string,
	app: App,
	file: TFile,
	options: ExportOptions,
): Promise<File> {
	const html = await marked.parse(markdown);

	if (options.type === "pdf") {
		await initializePdfRenderer(app);

		const title = options.includeTitle ? `<h1>${escapeHtml(file.basename)}</h1>` : "";
		const pdfHtml = `<html><body><main class="export-note">${title}${html}</main></body></html>`;
		const pdf = await render(pdfHtml, {
			size: options.pageSize,
			landscape: options.landscape,
			margin: options.margin,
			css: pdfDocumentCss(options.scale),
			metadata: { title: file.basename },
		});
		// Copy into an ArrayBuffer-backed view accepted by BlobPart.
		const pdfBytes = Uint8Array.from(pdf);
		return new File([pdfBytes.buffer], `${file.basename}.pdf`, { type: "application/pdf" });
	}

	const htmlDocument = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(file.basename)}</title>
  <style>${HTML_DOCUMENT_CSS}</style>
</head>
<body>
<main class="export-note">${html}</main>
</body>
</html>`;

	return new File([htmlDocument], `${file.basename}.html`, { type: "text/html;charset=utf-8" });
}

export async function deliverExportFile(file: File): Promise<void> {
	if (Platform.isMobile) {
		const shareData: ShareData = {
			files: [file],
			title: file.name,
		};

		if (!navigator.share || (navigator.canShare && !navigator.canShare(shareData))) {
			throw new Error("File sharing is not supported on this device");
		}

		await navigator.share(shareData);

		return;
	}

	const url = URL.createObjectURL(file);
	const link = document.body.createEl("a");
	link.href = url;
	link.download = file.name;
	link.click();
	link.remove();

	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
