import { escapeHtml } from "./escapeHtml";

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
