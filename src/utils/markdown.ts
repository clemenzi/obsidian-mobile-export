import type { App, TFile } from "obsidian";
import { micromark, type Options } from "micromark";

type SyntaxExtension = NonNullable<Options["extensions"]>[number];
type Construct = Exclude<NonNullable<NonNullable<SyntaxExtension["text"]>[number]>, unknown[]>;
type Tokenize = NonNullable<Construct["tokenize"]>;
type State = ReturnType<Tokenize>;
type HtmlExtension = NonNullable<Options["htmlExtensions"]>[number];
type Handler = NonNullable<NonNullable<HtmlExtension["exit"]>["data"]>;
type TokenName = Parameters<Parameters<Tokenize>[0]["enter"]>[0];

// Parse these as inline constructs, rather than replacing text in the resulting
// HTML (which would also change code blocks, attributes, and escaped markers).
function inlineSyntax(): SyntaxExtension {
	return {
		text: {
			61: {
				name: "obsidianHighlight",
				tokenize: tokenizePair(61, "obsidianHighlight", "highlightText"),
			},
			91: {
				name: "obsidianWikiLink",
				tokenize: tokenizePair(91, "obsidianWikiLink", "wikiLinkText"),
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

		function start(code: Parameters<State>[0]): State {
			effects.enter(name as TokenName);
			effects.consume(code);
			return second;
		}
		function second(code: Parameters<State>[0]): State | undefined {
			if (code !== marker) return nok(code);
			effects.consume(code);
			effects.enter(content as TokenName);
			return inside;
		}
		function inside(code: Parameters<State>[0]): State | undefined {
			if (code === null || code === -1 || code === 10 || code === 13) return nok(code);
			if (code === endMarker) return closing;
			effects.consume(code);
			length++;
			return inside;
		}
		function closing(code: Parameters<State>[0]): State | undefined {
			effects.exit(content as TokenName);
			effects.consume(code);
			return last;
		}
		function last(code: Parameters<State>[0]): State | undefined {
			if (code !== endMarker || length === 0) return nok(code);
			effects.consume(code);
			effects.exit(name as TokenName);
			return ok;
		}
	};
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

export function renderMarkdown(markdown: string, app: App, file: TFile): string {
	let wikiText = "";
	let highlightText = "";
	const exit: Record<string, Handler> = {
		wikiLinkText(token) {
			wikiText = this.sliceSerialize(token);
		},
		highlightText(token) {
			highlightText = this.sliceSerialize(token);
		},
		obsidianHighlight() {
			this.raw(`<mark>${escapeHtml(highlightText)}</mark>`);
		},
		obsidianWikiLink() {
			const separator = wikiText.indexOf("|");
			const target = (separator < 0 ? wikiText : wikiText.slice(0, separator)).trim();
			const label =
				separator < 0
					? target.split("#")[0]?.split("/").pop() || target
					: wikiText.slice(separator + 1);
			const path = target.split("#")[0];
			const destination = path ? app.metadataCache.getFirstLinkpathDest(path, file.path) : file;
			if (!destination) {
				this.raw(escapeHtml(label));
				return;
			}
			const uri = `obsidian://open?vault=${encodeURIComponent(app.vault.getName())}&file=${encodeURIComponent(destination.path)}`;
			this.raw(`<a href="${escapeHtml(uri)}">${escapeHtml(label)}</a>`);
		},
	};

	return micromark(markdown, {
		extensions: [inlineSyntax()],
		htmlExtensions: [
			{
				enter: {
					wikiLinkText() {
						wikiText = "";
					},
					highlightText() {
						highlightText = "";
					},
				},
				exit,
			} as HtmlExtension,
		],
	});
}
