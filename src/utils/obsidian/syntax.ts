import type { Options } from "micromark";

type SyntaxExtension = NonNullable<Options["extensions"]>[number];
type Construct = Exclude<NonNullable<NonNullable<SyntaxExtension["text"]>[number]>, unknown[]>;
type Tokenize = NonNullable<Construct["tokenize"]>;
type State = ReturnType<Tokenize>;
type TokenName = Parameters<Parameters<Tokenize>[0]["enter"]>[0];
type Code = Parameters<State>[0];

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
