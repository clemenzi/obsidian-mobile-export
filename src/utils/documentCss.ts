// Keep exported documents independent from vault themes and external fonts.
// Stick to CSS supported by both browsers and Takumi's CSS parser.
function documentCss(fontSize: number): string {
	return `
html {
  font-size: ${fontSize}px;
}

body {
  margin: 0;
  background: #ffffff;
  color: #202124;
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1.55;
}

.export-note {
  overflow-wrap: break-word;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  color: #111111;
  line-height: 1.2;
  font-weight: 700;
  margin-top: 1.6em;
  margin-bottom: 0.55em;
}

h1 {
  font-size: 2em;
  margin-top: 0;
  padding-bottom: 0.3em;
  border-bottom: 2px solid #222222;
}

h2 {
  font-size: 1.5em;
  padding-bottom: 0.2em;
  border-bottom: 1px solid #d8d8d8;
}

h3 {
  font-size: 1.25em;
}

h4, h5, h6 {
  font-size: 1em;
}

/* Text */
p, ul, ol, pre, blockquote, table {
  margin: 0 0 1em;
}

li {
  margin-bottom: 0.25em;
}

a {
  color: #202124;
  text-decoration: underline;
}

strong {
  color: #111111;
}

mark {
  background: #fff1a8;
  color: inherit;
}

/* Quotes */
blockquote {
  margin-left: 0;
  padding: 0.15em 0 0.15em 1em;
  border-left: 3px solid #b8b8b8;
  color: #555555;
}

/* Obsidian callouts */
.callout {
  padding: 0.8em 1em;
  border: 1px solid #d6d6d6;
  border-left: 4px solid #555555;
  border-radius: 0.25em;
  background: #f7f7f7;
  break-inside: avoid;
}

.callout-title {
  color: #202124;
  font-weight: 700;
  margin-bottom: 0.35em;
}

.callout p:last-child {
  margin-bottom: 0;
}

/* Code */
code, pre {
  font-family: monospace;
}

code {
  background: #f2f2f2;
  padding: 0.1em 0.25em;
}

pre {
  padding: 1em;
  background: #f5f5f5;
  border: 1px solid #dddddd;
  border-radius: 0.25em;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

pre code {
  padding: 0;
  background: transparent;
}

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  border: 1px solid #d4d4d4;
  padding: 0.55em 0.65em;
  text-align: left;
}

th {
  color: #111111;
  background: #f2f2f2;
  font-weight: 700;
}

/* Separators */
hr {
  border: 0;
  border-top: 1px solid #cccccc;
  margin: 1.75em 0;
}

/* Media */
img, video, iframe {
  max-width: 100%;
}

.math-inline img {
  vertical-align: baseline;
}

.math-display img {
  max-width: 100%;
  height: auto;
}

.math-display {
  display: block;
  margin: 1.25em 0;
  overflow-x: auto;
  text-align: center;
}

audio {
  width: 100%;
}

iframe {
  width: 100%;
  min-height: 24rem;
  border: 1px solid #d4d4d4;
}
`;
}

export const HTML_DOCUMENT_CSS = `${documentCss(16)}
.export-note {
  max-width: 46rem;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

@media print {
  .export-note {
    max-width: none;
    padding: 0;
  }
}
`;

// Obsidian's default light-theme callout palette for the static PDF renderer.
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
			return `${selectors.join(",\n")} {\n  background: ${background};\n  border-left-color: ${color};\n}\n${selectors.map((selector) => `${selector} > p > .callout-title`).join(",\n")} {\n  color: ${color};\n}`;
		})
		.join("\\n");
}

/** PDF-specific styles, combined with the shared document foundation above. */
export function pdfDocumentCss(scale: number): string {
	return `${documentCss((16 * scale) / 100)}
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
