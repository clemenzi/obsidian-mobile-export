import { App, Platform, TFile } from "obsidian";
import init, { render } from "takumi-pdf/no-init";
import type { ExportOptions } from "../exportOptions";
import { createHtmlDocument } from "./htmlExport";
import { renderMarkdown } from "./markdown";
import { createPdfFile } from "./pdfExport";

export async function createExportFile(
	markdown: string,
	app: App,
	file: TFile,
	options: ExportOptions,
): Promise<File> {
	const html = renderMarkdown(markdown, app, file);

	if (options.type === "pdf") {
		return createPdfFile(html, file, options, app, init, render);
	}

	return createHtmlDocument(html, file.basename);
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
