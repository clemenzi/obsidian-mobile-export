// Keep exports self-contained: no vault theme styles or external fonts are required.
// Use simple CSS rules supported by both browsers and Takumi's CSS parser.
export const DOCUMENT_CSS = `
html {
  font-size: 16px;
}
body {
  margin: 0;
  background: #ffffff;
  color: #253047;
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1.6;
}
.export-note {
  overflow-wrap: break-word;
}
h1, h2, h3, h4, h5, h6 {
  color: #15233c;
  line-height: 1.25;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}
h1 { font-size: 2em; }
h2 { font-size: 1.5em; }
h3 { font-size: 1.25em; }
h4, h5, h6 { font-size: 1em; }
p, ul, ol, pre, blockquote, table { margin-top: 0; margin-bottom: 1em; }
li { margin-bottom: 0.25em; }
a { color: #2563a6; text-decoration: underline; }
blockquote {
  margin-left: 0;
  padding: 0.25em 1em;
  border-left: 3px solid #8ba9cd;
  color: #475569;
}
code, pre { font-family: monospace; }
code { background: #f1f5f9; }
pre {
  padding: 1em;
  background: #f1f5f9;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
pre code { background: transparent; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #cbd5e1; padding: 0.5em; text-align: left; }
th { background: #f1f5f9; }
hr { border: 0; border-top: 1px solid #cbd5e1; margin: 1.5em 0; }
img { max-width: 100%; height: auto; }
`;

export const HTML_DOCUMENT_CSS = `${DOCUMENT_CSS}
.export-note { max-width: 46rem; margin: 0 auto; padding: 2rem 1.5rem; }
@media print { .export-note { max-width: none; padding: 0; } }
`;

export function pdfDocumentCss(scale: number): string {
  return `${DOCUMENT_CSS}\nhtml { font-size: ${16 * scale / 100}px; }`;
}
