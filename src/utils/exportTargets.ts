import { TAbstractFile, TFile, TFolder } from "obsidian";

export function collectMarkdownFiles(
	targets: TAbstractFile[],
	includeSubfolders: boolean,
): TFile[] {
	const files = new Map<string, TFile>();
	const visit = (target: TAbstractFile): void => {
		if (target instanceof TFile && target.extension.toLowerCase() === "md") {
			files.set(target.path, target);
		} else if (target instanceof TFolder) {
			for (const child of target.children) {
				if (includeSubfolders || child instanceof TFile) visit(child);
			}
		}
	};
	for (const target of targets) visit(target);
	return [...files.values()].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export function archivePath(file: TFile, targets: TAbstractFile[], extension: string): string {
	let path = file.path;
	const folder = targets.length === 1 ? targets[0] : undefined;
	if (folder instanceof TFolder && folder.parent && folder.parent.path !== "/") {
		path = path.slice(folder.parent.path.length + 1);
	}
	if (
		/^[\\/]/.test(path) ||
		/^[a-z]:/i.test(path) ||
		path.split(/[\\/]/).some((part) => !part || part === "." || part === "..") ||
		[...path].some((character) => character.charCodeAt(0) < 32)
	) {
		throw new Error("Unsafe archive path");
	}
	// Backslashes are valid vault filename characters on some platforms, but ZIP separators elsewhere.
	return path.replace(/\\/g, "/").replace(/\.[^.]+$/, `.${extension}`);
}

export function archiveName(scope: string): string {
	const name = [...scope]
		.map((character) =>
			character.charCodeAt(0) < 32 || /[\\/:*?"<>|]/.test(character) ? "_" : character,
		)
		.join("");
	return `${name || "Notes"}.zip`;
}
