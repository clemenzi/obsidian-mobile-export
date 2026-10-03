import type { Options } from "micromark";
import { mathjax } from "@mathjax/src/js/mathjax.js";
import { TeX } from "@mathjax/src/js/input/tex.js";
import "@mathjax/src/js/input/tex/ams/AmsConfiguration.js";
import "@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js";
import { SVG } from "@mathjax/src/js/output/svg.js";
import { liteAdaptor } from "@mathjax/src/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "@mathjax/src/js/handlers/html.js";
import { MathJaxNewcmFont } from "@mathjax/mathjax-newcm-font/js/svg.js";

type HtmlExtension = NonNullable<Options["htmlExtensions"]>[number];

// SVG paths are included in each image (fontCache: local), so neither HTML nor
// Takumi PDF output needs MathML, web fonts, external assets, or network access.
let renderer: ReturnType<typeof createRenderer> | undefined;

function createRenderer() {
	const adaptor = liteAdaptor();
	RegisterHTMLHandler(adaptor);
	const document = mathjax.document("", {
		InputJax: new TeX({ packages: ["base", "ams", "newcommand"] }),
		// Inline linebreaking produces multiple SVGs; each formula must be one image.
		OutputJax: new SVG({
			fontCache: "local",
			font: new MathJaxNewcmFont(),
			linebreaks: { inline: false },
		}),
	});
	return { adaptor, document };
}

function imageForMath(tex: string, display: boolean): string {
	const { adaptor, document } = (renderer ??= createRenderer());
	const container: unknown = document.convert(tex, { display });
	const markup = adaptor.outerHTML(container as Parameters<typeof adaptor.outerHTML>[0]);
	const svg = markup.match(/<svg\b[\s\S]*?<\/svg>/)?.[0];
	if (!svg) throw new Error("MathJax did not produce an SVG image");

	// New Computer Modern's x-height is 0.442em. Keep intrinsic pixel sizes
	// for image decoding, but size the element in em so it follows nearby text.
	const exToEm = 0.442;
	const widthEm = Number(svg.match(/\bwidth="([\d.]+)ex"/)?.[1]) * exToEm;
	const heightEm = Number(svg.match(/\bheight="([\d.]+)ex"/)?.[1]) * exToEm;
	const baselineEm = Number(svg.match(/vertical-align:\s*(-?[\d.]+)ex/)?.[1] ?? 0) * exToEm;
	const width = widthEm * 16;
	const height = heightEm * 16;
	const sized = svg
		.replace(/\bwidth="[\d.]+ex"/, `width="${width}px"`)
		.replace(/\bheight="[\d.]+ex"/, `height="${height}px"`)
		.replace(/currentColor/g, "#253047");
	const source = `data:image/svg+xml,${encodeURIComponent(sized)}`;
	// The SVG's baseline offset must be applied to the image itself: styles
	// inside an SVG image cannot align it with the surrounding HTML text.
	const alignment = display ? "" : ` vertical-align: ${baselineEm}em;`;
	return `<img class="math-image" src="${source}" width="${width}" height="${height}" style="width: ${widthEm}em; height: ${heightEm}em;${alignment}" alt="${escapeHtml(tex)}">`;
}

export function mathSvgHtml(): HtmlExtension {
	return {
		enter: {
			mathFlow() {
				this.lineEndingIfNeeded();
				this.tag('<div class="math math-display">');
			},
			mathFlowFenceMeta() {
				this.buffer();
			},
			mathText() {
				this.tag('<span class="math math-inline">');
				this.buffer();
			},
		},
		exit: {
			mathFlow() {
				const value = this.resume().replace(/(?:\r?\n|\r)$/, "");
				this.tag(imageForMath(value, true));
				this.tag("</div>");
				this.setData("mathFlowOpen");
				this.setData("slurpOneLineEnding");
			},
			mathFlowFence() {
				if (!this.getData("mathFlowOpen")) {
					this.setData("mathFlowOpen", true);
					this.setData("slurpOneLineEnding", true);
					this.buffer();
				}
			},
			mathFlowFenceMeta() {
				this.resume();
			},
			mathFlowValue(token) {
				this.raw(this.sliceSerialize(token));
			},
			mathText() {
				this.tag(imageForMath(this.resume(), false));
				this.tag("</span>");
			},
			mathTextData(token) {
				this.raw(this.sliceSerialize(token));
			},
		},
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
