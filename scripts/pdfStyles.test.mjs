import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { build } from "esbuild";
import { micromark } from "micromark";
import init, { render } from "takumi-pdf/no-init";

// Bundle the pure TypeScript modules in memory: no Obsidian runtime or generated
// files are needed to exercise the exact stylesheet passed to the PDF renderer.
const buildResult = await build({
	entryPoints: ["src/utils/pdfStyles.ts", "src/utils/obsidian/callouts.ts"],
	bundle: true,
	write: false,
	outdir: "out",
	format: "esm",
	platform: "node",
});
const [styles, callouts] = await Promise.all(
	buildResult.outputFiles.map(
		(file) => import(`data:text/javascript;base64,${Buffer.from(file.text).toString("base64")}`),
	),
);
const types = [
	"note",
	"abstract",
	"summary",
	"tldr",
	"info",
	"todo",
	"tip",
	"hint",
	"important",
	"success",
	"check",
	"done",
	"question",
	"help",
	"faq",
	"warning",
	"caution",
	"attention",
	"failure",
	"fail",
	"missing",
	"danger",
	"error",
	"bug",
	"example",
	"quote",
	"cite",
];

const markdown =
	"# PDF styles\n\n" +
	types
		.concat("custom")
		.map(
			(type) =>
				`> [!${type}] ${type}\n> Content with **bold** and a [link](https://obsidian.md).\n`,
		)
		.join("\n") +
	"\n> [!quote]- Folded title\n> Always visible.\n>\n> > [!success] Nested\n> > Nested content.\n";
const html = callouts.renderCallouts(micromark(markdown));

test("PDF style covers every standard callout and alias, with scoped titles", () => {
	const css = styles.pdfDocumentCss(100);
	for (const type of types) {
		assert.ok(css.includes(`.callout[data-callout="${type}"]`), type);
		assert.ok(css.includes(`.callout[data-callout="${type}"] > p > .callout-title`), type);
	}
	assert.match(css, /font-family: Inter/);
	assert.match(styles.pdfDocumentCss(125), /font-size: 20px/);
	assert.match(html, /data-callout="custom"/);
	assert.match(html, /data-callout-fold="-"/);
	assert.match(html, /Always visible/);
	assert.match(html, /Nested content/);
});

test("Takumi renders standard, custom, folded and nested callouts at multiple scales", async () => {
	await init({
		module_or_path: await readFile("node_modules/takumi-pdf/pkg/takumi_pdf_wasm_bg.wasm"),
	});
	const fonts = await Promise.all(
		[400, 700].map(async (weight) => ({
			name: "Inter",
			weight,
			data: await readFile(
				`node_modules/@fontsource/inter/files/inter-latin-${weight}-normal.woff2`,
			),
		})),
	);
	for (const scale of [75, 100, 125]) {
		const bytes = await render(
			`<html><body><main class="export-note">${html}</main></body></html>`,
			{
				css: styles.pdfDocumentCss(scale),
				fonts,
				fontFamilies: ["Inter"],
				size: "a4",
			},
		);
		assert.equal(Buffer.from(bytes.subarray(0, 4)).toString(), "%PDF");
		assert.ok(bytes.length > 1000);
	}
});
