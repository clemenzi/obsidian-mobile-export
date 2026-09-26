import { App, Platform, TFile } from "obsidian";
import { marked } from "marked";
import init, { render } from "takumi-pdf/no-init";
import { loadPdfWasm } from "./pdfWasm";
import type { ExportOptions } from "../exportOptions";

let pdfRendererInitialized = false;

export async function createExportFile(
	markdown: string,
	app: App,
	file: TFile,
	options: ExportOptions,
): Promise<File> {
	const html = await marked.parse(markdown);

	if (options.type === "pdf") {
		if (!pdfRendererInitialized) {
			await init({ module_or_path: await loadPdfWasm(app) });
			pdfRendererInitialized = true;
		}

		const title = options.includeTitle ? `<h1>${escapeHtml(file.basename)}</h1>` : "";
		const pdfHtml = `<html><body>${title}${html}</body></html>`;
		const pdf = await render(pdfHtml, {
			size: options.pageSize,
			landscape: options.landscape,
			margin: options.margin,
			css: options.scale === 100 ? undefined : `html { font-size: ${options.scale}%; }`,
			metadata: { title: file.basename },
		});
		// Copy into an ArrayBuffer-backed view accepted by BlobPart.
		const pdfBytes = new Uint8Array(pdf.byteLength);
		pdfBytes.set(pdf);
		return new File([pdfBytes.buffer], `${file.basename}.pdf`, { type: "application/pdf" });
	}

	const htmlDocument = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(file.basename)}</title>
</head>
<body>
${html}
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

		if (
			!navigator.share ||
			(navigator.canShare && !navigator.canShare(shareData))
		) {
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
