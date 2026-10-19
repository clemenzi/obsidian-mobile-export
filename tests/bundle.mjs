import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

export async function importTestBundle(options) {
	const directory = await mkdtemp(join(tmpdir(), "mobile-export-test-"));
	try {
		const bundled = await build(options);
		const path = join(directory, "bundle.mjs");
		await writeFile(path, bundled.outputFiles[0].text);
		// eslint-disable-next-line no-unsanitized/method -- Import only the locally built test bundle.
		return await import(pathToFileURL(path).href);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}
