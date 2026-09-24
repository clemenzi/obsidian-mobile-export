import { TFile } from "obsidian";
import { marked } from "marked";
import init, { render } from "takumi-pdf/no-init";
import wasm from "takumi-pdf/takumi_pdf_wasm_bg.wasm";
import type { ExportOptions } from "../exportOptions";

let pdfRendererInitialized = false;

export async function exportFile(
	markdown: string,
	file: TFile,
	options: ExportOptions,
): Promise<void> {
	const html = await marked.parse(markdown);

	if (options.type === "pdf") {
		if (!pdfRendererInitialized) {
			await init({ module_or_path: wasm.buffer as ArrayBuffer });
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
		downloadBlob(new Blob([pdfBytes.buffer], { type: "application/pdf" }), file, "pdf");
		return;
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

	downloadBlob(
		new Blob([htmlDocument], { type: "text/html;charset=utf-8" }),
		file,
		"html",
	);
}

function downloadBlob(blob: Blob, file: TFile, extension: ExportOptions["type"]): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${file.basename}.${extension}`;
	link.click();
	URL.revokeObjectURL(url);
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
