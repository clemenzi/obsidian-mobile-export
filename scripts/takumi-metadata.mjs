import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

// Resolve the exported artifact from the same installed package used by esbuild.
export const wasmPath = require.resolve("takumi-pdf/takumi_pdf_wasm_bg.wasm");

export async function getTakumiMetadata() {
	const project = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
	const installed = JSON.parse(await readFile(join(dirname(wasmPath), "../package.json"), "utf8"));
	const version = project.dependencies["takumi-pdf"];
	if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version) || version !== installed.version) {
		throw new Error(
			"Pin takumi-pdf to an exact version and install matching dependencies before building.",
		);
	}
	const wasm = await readFile(wasmPath);
	if (!WebAssembly.validate(wasm)) {
		throw new Error("The installed Takumi PDF WASM is invalid. Reinstall dependencies.");
	}
	return {
		__TAKUMI_VERSION__: JSON.stringify(version),
		__TAKUMI_WASM_SHA256__: JSON.stringify(createHash("sha256").update(wasm).digest("hex")),
	};
}
