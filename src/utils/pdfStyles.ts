import { pdfDocumentCss as baseDocumentCss } from "./documentCss";

// Obsidian's default light-theme callout palette. Resolve aliases here rather
// than relying on CSS variables or vault theme snippets in the PDF renderer.
const calloutPalette = [
	{ types: ["note"], color: "#086ddd", background: "#eaf1fc" },
	{ types: ["abstract", "summary", "tldr"], color: "#00a6b5", background: "#e5f6f8" },
	{ types: ["info", "todo"], color: "#086ddd", background: "#eaf1fc" },
	{ types: ["tip", "hint", "important"], color: "#00a6b5", background: "#e5f6f8" },
	{ types: ["success", "check", "done"], color: "#08b94e", background: "#e6f8ed" },
	{ types: ["question", "help", "faq"], color: "#bf8700", background: "#fff5df" },
	{ types: ["warning", "caution", "attention"], color: "#ec7500", background: "#fff1e5" },
	{ types: ["failure", "fail", "missing"], color: "#e93147", background: "#fdebef" },
	{ types: ["danger", "error", "bug"], color: "#e93147", background: "#fdebef" },
	{ types: ["example"], color: "#7852ee", background: "#f1edfd" },
	{ types: ["quote", "cite"], color: "#707070", background: "#f1f1f1" },
];

function calloutCss(): string {
	return calloutPalette
		.map(({ types, color, background }) => {
			const selectors = types.map((type) => `.callout[data-callout="${type}"]`);
			return `${selectors.join(",\n")} {
  background: ${background};
  border-left-color: ${color};
}
${selectors.map((selector) => `${selector} > p > .callout-title`).join(",\n")} {
  color: ${color};
}`;
		})
		.join("\n");
}

// Keep the HTML export unchanged. Use concrete colors and ordinary selectors
// supported by Takumi; no external fonts, theme CSS, or browser-only effects.
export function pdfDocumentCss(scale: number): string {
	return `${baseDocumentCss(scale)}
body {
  color: #222222;
  font-family: Inter, Arial, sans-serif;
  line-height: 1.6;
}

h1, h2, h3, h4, h5, h6 {
  color: #222222;
  font-weight: 700;
  line-height: 1.3;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  padding-bottom: 0;
  border-bottom: 0;
  break-after: avoid;
}

h1 { font-size: 1.802em; }
h2 { font-size: 1.602em; }
h3 { font-size: 1.424em; }
h4 { font-size: 1.266em; }
h5 { font-size: 1.125em; }
h6 { font-size: 1em; color: #666666; }
.export-note > h1:first-child { margin-top: 0; }

p, ul, ol, pre, blockquote, table { margin: 0 0 1em; }
ul, ol { padding-left: 1.8em; }
li { margin-bottom: 0.25em; }
li > ul, li > ol { margin-bottom: 0; }
a { color: #7852ee; text-decoration: underline; }
strong { color: inherit; }
mark { background: #fff0a3; color: inherit; }

blockquote {
  margin-left: 0;
  margin-right: 0;
  padding: 0.25em 0 0.25em 1em;
  border-left: 2px solid #ababab;
  color: #666666;
}

/* Unknown/custom types use Obsidian's note color as a fallback. Fold markers
   never hide content in a static export, including nested callouts. */
.callout {
  padding: 0.75em 1em;
  border: 0;
  border-left: 3px solid #086ddd;
  border-radius: 0.4em;
  background: #eaf1fc;
  color: #222222;
  break-inside: avoid;
  box-decoration-break: clone;
}
.callout-title {
  display: block;
  color: #086ddd;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 0.4em;
}
/* The Markdown converter puts a line break after the title. A block title
   already supplies that break, so avoid adding an extra empty line. */
.callout-title + br { display: none; }
.callout > :last-child { margin-bottom: 0; }
.callout .callout { margin-top: 0.75em; }
${calloutCss()}

code, pre { font-family: monospace; }
code {
  color: #b33a3a;
  background: #f2f2f2;
  padding: 0.1em 0.25em;
  border-radius: 0.2em;
  font-size: 0.9em;
}
pre {
  background: #f6f6f6;
  border: 1px solid #e0e0e0;
  border-radius: 0.4em;
  padding: 1em;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
pre code { color: #222222; background: transparent; padding: 0; }

table { width: 100%; border-collapse: collapse; font-size: 0.95em; }
th, td { border: 1px solid #d6d6d6; padding: 0.5em 0.75em; text-align: left; }
th { background: #f6f6f6; color: #222222; font-weight: 700; }
tr { break-inside: avoid; }
hr { border: 0; border-top: 1px solid #d6d6d6; margin: 2em 0; }
`;
}
