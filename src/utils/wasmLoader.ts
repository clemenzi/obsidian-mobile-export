import { App, requestUrl } from "obsidian";

// Keep this version in sync with the exact takumi-pdf dependency in package.json.
const TAKUMI_VERSION = "0.15.0";
const WASM_URL = `https://cdn.jsdelivr.net/npm/takumi-pdf@${TAKUMI_VERSION}/pkg/takumi_pdf_wasm_bg.wasm`;

export async function loadPdfWasm(app: App): Promise<ArrayBuffer> {
	const adapter = app.vault.adapter;
	const path = `${app.vault.configDir}/plugins/mobile-export/takumi-pdf-${TAKUMI_VERSION}.wasm`;

	if (await adapter.exists(path)) {
		return adapter.readBinary(path);
	}

	const response = await requestUrl({ url: WASM_URL });
	const wasm = response.arrayBuffer;
	if (!WebAssembly.validate(wasm)) {
		throw new Error("Invalid Takumi PDF WASM download");
	}
	await adapter.writeBinary(path, wasm);
	return wasm;
}
