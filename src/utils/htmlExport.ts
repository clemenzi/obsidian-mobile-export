import { HTML_DOCUMENT_CSS } from "./documentCss";

export function createHtmlDocument(html: string, title: string): File {
	const document = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${HTML_DOCUMENT_CSS}</style>
</head>
<body>
<main class="export-note">${html}</main>
</body>
</html>`;

	return new File([document], `${title}.html`, { type: "text/html;charset=utf-8" });
}

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => {
		switch (character) {
			case "&":
				return "&amp;";
			case "<":
				return "&lt;";
			case ">":
				return "&gt;";
			case '"':
				return "&quot;";
			default:
				return "&#39;";
		}
	});
}
