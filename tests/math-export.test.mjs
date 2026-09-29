import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { inflateSync } from "node:zlib";
import { build } from "esbuild";
import init, { render } from "takumi-pdf/no-init";

const result = await build({
	entryPoints: ["src/utils/markdown.ts"],
	bundle: true,
	platform: "node",
	format: "esm",
	write: false,
});
const { renderMarkdown } = await import(
	`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);
const file = { path: "Note.md", basename: "Note", extension: "md" };
const app = {
	metadataCache: { getFirstLinkpathDest: () => file },
	vault: { getName: () => "Vault", getResourcePath: () => "" },
};

test("inline and display math become self-contained SVG images", () => {
	const html = renderMarkdown("Inline $x^2$\n\n$$\n\\frac{1}{2}\n$$", app, file);
	const images = [...html.matchAll(/<img class="math-image"[^>]+>/g)].map(([image]) => image);
	assert.equal(images.length, 2);
	for (const image of images) {
		assert.match(image, /src="data:image\/svg\+xml,/);
		assert.match(image, /width="[\d.]+" height="[\d.]+"/);
		const svg = decodeURIComponent(image.match(/src="data:image\/svg\+xml,([^"]+)"/)[1]);
		assert.match(svg, /<svg\b[^>]*viewBox=/);
		assert.match(svg, /<defs>.*<path/s);
		assert.doesNotMatch(svg, /currentColor|<image\b|url\(https?:/);
	}
});

test("Takumi embeds the SVG paths into PDF output", async () => {
	const wasm = await readFile("takumi-pdf-0.15.0.wasm");
	await init({
		module_or_path: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength),
	});
	const html = renderMarkdown("$$\n\\frac{1}{2}\n$$", app, file);
	const pdf = Buffer.from(await render(`<html><body>${html}</body></html>`));
	const streams = [...pdf.toString("latin1").matchAll(/stream\n([\s\S]*?)\nendstream/g)];
	const decoded = streams.flatMap(([, stream]) => {
		try {
			return [inflateSync(Buffer.from(stream, "latin1")).toString()];
		} catch {
			return [];
		}
	});
	assert.ok(decoded.some((stream) => /\/Alt\(.*frac\{1\}\{2\}\)/.test(stream)));
	assert.ok(decoded.some((stream) => /\d+ \d+ m [\s\S]*? [cf] /.test(stream)));
});
