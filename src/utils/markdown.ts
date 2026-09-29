import type { App, TFile } from "obsidian";
import { micromark } from "micromark";
import { frontmatter, frontmatterHtml } from "micromark-extension-frontmatter";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { math, mathHtml } from "micromark-extension-math";
import { obsidianHtml, obsidianSyntax, renderCallouts } from "./obsidianSyntax";

export function renderMarkdown(markdown: string, app: App, file: TFile): string {
	const html = micromark(markdown, {
		allowDangerousHtml: true,
		extensions: [frontmatter(), gfm(), math(), obsidianSyntax()],
		htmlExtensions: [
			frontmatterHtml(),
			gfmHtml(),
			mathHtml({ output: "mathml", throwOnError: false }),
			obsidianHtml(app, file),
		],
	});

	return renderCallouts(html).replace(/<p>\s*<\/p>\n?/g, "");
}
