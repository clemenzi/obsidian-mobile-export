import type { App, TFile } from "obsidian";
import type { Options } from "micromark";

type SyntaxExtension = NonNullable<Options["extensions"]>[number];
type Construct = Exclude<NonNullable<NonNullable<SyntaxExtension["text"]>[number]>, unknown[]>;
type Tokenize = NonNullable<Construct["tokenize"]>;
type State = ReturnType<Tokenize>;
type HtmlExtension = NonNullable<Options["htmlExtensions"]>[number];
type Handler = NonNullable<NonNullable<HtmlExtension["exit"]>["data"]>;
type TokenName = Parameters<Parameters<Tokenize>[0]["enter"]>[0];
type Code = Parameters<State>[0];

const IMAGE_EXTENSIONS = new Set(["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"]);
const AUDIO_EXTENSIONS = new Set(["flac", "m4a", "mp3", "ogg", "wav", "webm"]);
const VIDEO_EXTENSIONS = new Set(["mkv", "mov", "mp4", "ogv", "webm"]);

export function obsidianSyntax(): SyntaxExtension {
	const wikiLink: Construct = {
		name: "obsidianWikiLink",
		tokenize: tokenizePair(91, "obsidianWikiLink", "wikiLinkText"),
	};

	return {
		text: {
			33: { name: "obsidianEmbed", tokenize: tokenizeEmbed },
			37: { name: "obsidianComment", tokenize: tokenizeComment },
			61: {
				name: "obsidianHighlight",
				tokenize: tokenizePair(61, "obsidianHighlight", "highlightText"),
			},
			91: wikiLink,
			94: {
				name: "obsidianBlockId",
				previous: (code) => code === null || code === 32 || code === -1 || isLineEnding(code),
				tokenize: tokenizeBlockId,
			},
		},
	};
}

function tokenizePair(marker: number, name: string, content: string) {
	return function tokenize(
		effects: Parameters<Tokenize>[0],
		ok: Parameters<Tokenize>[1],
		nok: Parameters<Tokenize>[2],
	): State {
		const endMarker = marker === 91 ? 93 : marker;
		let length = 0;
		return start;

		function start(code: Code): State {
			effects.enter(name as TokenName);
			effects.consume(code);
			return second;
		}
		function second(code: Code): State | undefined {
			if (code !== marker) return nok(code);
			effects.consume(code);
			effects.enter(content as TokenName);
			return inside;
		}
		function inside(code: Code): State | undefined {
			if (code === null || isLineEnding(code)) return nok(code);
			if (code === endMarker) return closing;
			effects.consume(code);
			length++;
			return inside;
		}
		function closing(code: Code): State | undefined {
			effects.exit(content as TokenName);
			effects.consume(code);
			return last;
		}
		function last(code: Code): State | undefined {
			if (code !== endMarker || length === 0) return nok(code);
			effects.consume(code);
			effects.exit(name as TokenName);
			return ok;
		}
	};
}

function tokenizeEmbed(
	effects: Parameters<Tokenize>[0],
	ok: Parameters<Tokenize>[1],
	nok: Parameters<Tokenize>[2],
): State {
	let length = 0;
	return start;

	function start(code: Code): State {
		effects.enter("obsidianEmbed" as TokenName);
		effects.consume(code);
		return firstBracket;
	}
	function firstBracket(code: Code): State | undefined {
		if (code !== 91) return nok(code);
		effects.consume(code);
		return secondBracket;
	}
	function secondBracket(code: Code): State | undefined {
		if (code !== 91) return nok(code);
		effects.consume(code);
		effects.enter("embedText" as TokenName);
		return inside;
	}
	function inside(code: Code): State | undefined {
		if (code === null || isLineEnding(code)) return nok(code);
		if (code === 93) return closing;
		effects.consume(code);
		length++;
		return inside;
	}
	function closing(code: Code): State {
		effects.exit("embedText" as TokenName);
		effects.consume(code);
		return last;
	}
	function last(code: Code): State | undefined {
		if (code !== 93 || length === 0) return nok(code);
		effects.consume(code);
		effects.exit("obsidianEmbed" as TokenName);
		return ok;
	}
}

function tokenizeComment(
	effects: Parameters<Tokenize>[0],
	ok: Parameters<Tokenize>[1],
	nok: Parameters<Tokenize>[2],
): State {
	return start;

	function start(code: Code): State {
		effects.enter("obsidianComment" as TokenName);
		effects.enter("commentMarker" as TokenName);
		effects.consume(code);
		return second;
	}
	function second(code: Code): State | undefined {
		if (code !== 37) return nok(code);
		effects.consume(code);
		effects.exit("commentMarker" as TokenName);
		return between;
	}
	function between(code: Code): State | undefined {
		if (code === null) return nok(code);
		if (isLineEnding(code)) {
			effects.enter("lineEnding");
			effects.consume(code);
			effects.exit("lineEnding");
			return between;
		}
		if (code === 37) {
			effects.enter("commentMarker" as TokenName);
			effects.consume(code);
			return maybeClose;
		}
		effects.enter("commentData" as TokenName);
		return data(code);
	}
	function data(code: Code): State | undefined {
		if (code === null || code === 37 || isLineEnding(code)) {
			effects.exit("commentData" as TokenName);
			return between(code);
		}
		effects.consume(code);
		return data;
	}
	function maybeClose(code: Code): State | undefined {
		if (code !== 37) {
			effects.exit("commentMarker" as TokenName);
			return between(code);
		}
		effects.consume(code);
		effects.exit("commentMarker" as TokenName);
		effects.exit("obsidianComment" as TokenName);
		return ok;
	}
}

function tokenizeBlockId(
	effects: Parameters<Tokenize>[0],
	ok: Parameters<Tokenize>[1],
	nok: Parameters<Tokenize>[2],
): State {
	let length = 0;
	return start;

	function start(code: Code): State {
		effects.enter("obsidianBlockId" as TokenName);
		effects.consume(code);
		return inside;
	}
	function inside(code: Code): State | undefined {
		if (isBlockIdCharacter(code)) {
			effects.consume(code);
			length++;
			return inside;
		}
		if (length === 0) return nok(code);
		if (code === 32 || code === -1 || code === -2) {
			effects.consume(code);
			return trailingWhitespace;
		}
		return finish(code);
	}
	function trailingWhitespace(code: Code): State | undefined {
		if (code === 32 || code === -1 || code === -2) {
			effects.consume(code);
			return trailingWhitespace;
		}
		return finish(code);
	}
	function finish(code: Code): State | undefined {
		if (code !== null && !isLineEnding(code)) return nok(code);
		effects.exit("obsidianBlockId" as TokenName);
		return ok(code);
	}
}

function isBlockIdCharacter(code: Code): boolean {
	return (
		code !== null &&
		((code >= 48 && code <= 57) ||
			(code >= 65 && code <= 90) ||
			(code >= 97 && code <= 122) ||
			code === 45 ||
			code === 95 ||
			code > 127)
	);
}

function isLineEnding(code: Code): boolean {
	return code === -3 || code === -4 || code === -5;
}

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

export function renderCallouts(html: string): string {
	return html.replace(
		/<blockquote>(\r?\n)<p>\[!([A-Za-z0-9_-]+)\]([+-])?(?:[ \t]+([^\r\n]*))?(\r?\n|(?=<\/p>))/g,
		(
			_match,
			lineBefore: string,
			rawType: string,
			fold: string | undefined,
			customTitle: string | undefined,
			lineAfter: string,
		) => {
			const type = rawType.toLowerCase();
			const title = customTitle?.trim() || calloutTitle(rawType);
			const collapsible = fold ? ` is-collapsible${fold === "-" ? " is-collapsed" : ""}` : "";
			const foldAttribute = fold ? ` data-callout-fold="${fold}"` : "";
			const breakAfter =
				lineAfter.startsWith("\r") || lineAfter.startsWith("\n") ? `<br>${lineAfter}` : "";
			return `<blockquote class="callout${collapsible}" data-callout="${escapeHtml(type)}"${foldAttribute}>${lineBefore}<p><span class="callout-title">${title}</span>${breakAfter}`;
		},
	);
}

function calloutTitle(type: string): string {
	return escapeHtml(
		type.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()),
	);
}

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => {
		const entities: Record<string, string> = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		};
		return entities[character] ?? character;
	});
}
