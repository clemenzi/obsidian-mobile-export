import { App, TAbstractFile, TFile } from "obsidian";
import type { ExportOptions } from "../exportOptions";
import { createExportFile } from "./export";
import { archivePath } from "./exportTargets";
import { ExportZip } from "./zipExport";

export type BulkDeliveryMode = "share-files" | "zip";
export type PreparedBulkExport =
	| { mode: "share-files"; files: File[] }
	| { mode: "zip"; archive: File };
export interface BulkExportFailure {
	path: string;
	reason: string;
}
export interface BulkExportProgress {
	completed: number;
	total: number;
	currentFile: string;
}

export async function prepareBulkExport(
	app: App,
	files: TFile[],
	targets: TAbstractFile[],
	options: ExportOptions,
	mode: BulkDeliveryMode,
	archiveName: string,
	onProgress: (progress: BulkExportProgress) => void,
	signal: AbortSignal,
): Promise<{
	result: PreparedBulkExport | null;
	failures: BulkExportFailure[];
	succeeded: number;
}> {
	const zip = mode === "zip" ? new ExportZip() : undefined;
	const rendered: File[] = [];
	const failures: BulkExportFailure[] = [];
	const paths = new Set<string>();
	let succeeded = 0;
	try {
		for (const [index, file] of files.entries()) {
			signal.throwIfAborted();
			const path = file.path;
			onProgress({ completed: index, total: files.length, currentFile: path });
			// Yield to the UI so progress and cancellation stay responsive between documents.
			await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
			signal.throwIfAborted();
			try {
				if (app.vault.getAbstractFileByPath(path) !== file)
					throw new Error("Note no longer exists");
				const entryPath = archivePath(file, targets, options.type);
				if (paths.has(entryPath)) throw new Error("Duplicate export path");
				const markdown = await app.vault.read(file);
				signal.throwIfAborted();
				const output = await createExportFile(markdown, app, file, options);
				signal.throwIfAborted();
				if (zip) {
					const data = new Uint8Array(await output.arrayBuffer());
					signal.throwIfAborted();
					zip.add(entryPath, data);
				} else {
					rendered.push(output);
				}
				paths.add(entryPath);
				succeeded++;
			} catch (error) {
				signal.throwIfAborted();
				failures.push({ path, reason: error instanceof Error ? error.message : String(error) });
			}
			onProgress({ completed: index + 1, total: files.length, currentFile: path });
		}
		signal.throwIfAborted();
		const result: PreparedBulkExport | null = !succeeded
			? null
			: zip
				? { mode: "zip", archive: zip.finish(archiveName) }
				: { mode: "share-files", files: rendered };
		return { result, failures, succeeded };
	} finally {
		zip?.dispose();
	}
}
