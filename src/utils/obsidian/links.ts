import type { App, TFile } from "obsidian";
import type { Options } from "micromark";
import { escapeHtml } from "./escapeHtml";

type HtmlExtension = NonNullable<Options["htmlExtensions"]>[number];
type Handler = NonNullable<NonNullable<HtmlExtension["exit"]>["data"]>;

const IMAGE_EXTENSIONS = new Set(["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"]);
const AUDIO_EXTENSIONS = new Set(["flac", "m4a", "mp3", "ogg", "wav", "webm"]);
const VIDEO_EXTENSIONS = new Set(["mkv", "mov", "mp4", "ogv", "webm"]);

export function obsidianHtml(app: App, file: TFile): HtmlExtension {
	let embedText = "";
	let highlightText = "";
	let wikiText = "";

	const exit: Record<string, Handler> = {
		wikiLinkText(token) {
			wikiText = this.sliceSerialize(token);
		},
		embedText(token) {
			embedText = this.sliceSerialize(token);
		},
		highlightText(token) {
			highlightText = this.sliceSerialize(token);
		},
		obsidianHighlight() {
			this.raw(`<mark>${escapeHtml(highlightText)}</mark>`);
		},
		obsidianWikiLink() {
			this.raw(renderWikiLink(wikiText, app, file));
		},
		obsidianEmbed() {
			this.raw(renderEmbed(embedText, app, file));
		},
	};

	return {
		enter: {
			wikiLinkText() {
				wikiText = "";
			},
			embedText() {
				embedText = "";
			},
			highlightText() {
				highlightText = "";
			},
		},
		exit,
	} as HtmlExtension;
}

function renderWikiLink(value: string, app: App, file: TFile): string {
	const { target, label } = splitTarget(value);
	const { path, subpath } = splitSubpath(target);
	const destination = path ? app.metadataCache.getFirstLinkpathDest(path, file.path) : file;
	if (!destination) return escapeHtml(label || defaultLabel(target));

	const uriTarget = `${destination.path}${subpath}`;
	const uri = `obsidian://open?vault=${encodeURIComponent(app.vault.getName())}&file=${encodeURIComponent(uriTarget)}`;
	return `<a class="internal-link" href="${escapeHtml(uri)}">${escapeHtml(label || defaultLabel(target))}</a>`;
}

function renderEmbed(value: string, app: App, file: TFile): string {
	const { target, label } = splitTarget(value);
	const { path } = splitSubpath(target);
	const destination = path ? app.metadataCache.getFirstLinkpathDest(path, file.path) : file;
	const fallbackLabel = label || defaultLabel(target);
	if (!destination) return escapeHtml(fallbackLabel);

	const source = escapeHtml(app.vault.getResourcePath(destination));
	const extension = destination.extension.toLowerCase();
	if (IMAGE_EXTENSIONS.has(extension)) {
		const dimensions = label.match(/^(\d+)(?:x(\d+))?$/);
		const size = dimensions
			? ` width="${dimensions[1]}"${dimensions[2] ? ` height="${dimensions[2]}"` : ""}`
			: "";
		const alt = dimensions ? destination.basename : fallbackLabel;
		return `<img class="internal-embed" src="${source}" alt="${escapeHtml(alt)}"${size}>`;
	}
	if (AUDIO_EXTENSIONS.has(extension)) {
		return `<audio class="internal-embed" src="${source}" controls></audio>`;
	}
	if (VIDEO_EXTENSIONS.has(extension)) {
		return `<video class="internal-embed" src="${source}" controls></video>`;
	}
	if (extension === "pdf") {
		return `<iframe class="internal-embed" src="${source}" title="${escapeHtml(fallbackLabel)}"></iframe>`;
	}
	if (extension === "md") {
		return renderWikiLink(value, app, file).replace(
			'class="internal-link"',
			'class="internal-link internal-embed"',
		);
	}

	return `<a class="internal-link internal-embed" href="${source}">${escapeHtml(fallbackLabel)}</a>`;
}

function splitTarget(value: string): { target: string; label: string } {
	const separator = value.indexOf("|");
	return {
		target: (separator < 0 ? value : value.slice(0, separator)).trim(),
		label: separator < 0 ? "" : value.slice(separator + 1).trim(),
	};
}

function splitSubpath(target: string): { path: string; subpath: string } {
	const separator = target.indexOf("#");
	return {
		path: (separator < 0 ? target : target.slice(0, separator)).trim(),
		subpath: separator < 0 ? "" : target.slice(separator),
	};
}

function defaultLabel(target: string): string {
	const { path, subpath } = splitSubpath(target);
	const filename = path.split("/").pop()?.replace(/\.md$/i, "") || "";
	const reference = subpath.replace(/^#\^?/, "");
	return filename && reference ? `${filename} > ${reference}` : filename || reference || target;
}
