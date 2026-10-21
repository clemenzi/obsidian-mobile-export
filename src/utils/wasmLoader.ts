import { App, requestUrl } from "obsidian";

const TAKUMI_VERSION = __TAKUMI_VERSION__;
const WASM_URL = `https://cdn.jsdelivr.net/npm/takumi-pdf@${TAKUMI_VERSION}/pkg/takumi_pdf_wasm_bg.wasm`;

export class PdfWasmError extends Error {}

async function isExpectedWasm(wasm: ArrayBuffer): Promise<boolean> {
	if (!WebAssembly.validate(wasm)) return false;

	const digest = await crypto.subtle.digest("SHA-256", wasm);
	const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
	return hex === __TAKUMI_WASM_SHA256__;
}

export async function loadPdfWasm(app: App): Promise<ArrayBuffer> {
	const adapter = app.vault.adapter;
	const path = `${app.vault.configDir}/plugins/mobile-export/takumi-pdf-${TAKUMI_VERSION}.wasm`;
	const temporaryPath = `${path}.tmp`;
	let cacheNeedsRepair = false;

	try {
		if (await adapter.exists(path)) {
			cacheNeedsRepair = true;
			const cached = await adapter.readBinary(path);
			if (await isExpectedWasm(cached)) return cached;
		}
	} catch {
		// An unreadable cache should be recoverable just like a corrupt one.
		cacheNeedsRepair = true;
	}

	let wasm: ArrayBuffer;
	try {
		const response = await requestUrl({ url: WASM_URL });
		if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
		wasm = response.arrayBuffer;
	} catch {
		throw new PdfWasmError(
			cacheNeedsRepair
				? "The PDF component cache is damaged or unreadable and could not be repaired. Connect to the internet, check access to cdn.jsdelivr.net, and export again."
				: "The PDF component could not be downloaded. Connect to the internet, check access to cdn.jsdelivr.net, and export again. After a successful download, PDF export works offline.",
		);
	}

	if (!(await isExpectedWasm(wasm))) {
		throw new PdfWasmError(
			"The PDF component download failed its integrity check. Export again to retry the download.",
		);
	}

	try {
		// Stage and verify before replacing an invalid cache. Never remove older versions.
		await adapter.writeBinary(temporaryPath, wasm);
		if (!(await isExpectedWasm(await adapter.readBinary(temporaryPath)))) {
			throw new Error("The saved PDF component failed its integrity check.");
		}
		if (await adapter.exists(path)) await adapter.remove(path);
		await adapter.rename(temporaryPath, path);
	} catch {
		throw new PdfWasmError(
			"The PDF component could not be cached. Check vault storage and permissions, then export again.",
		);
	} finally {
		try {
			if (await adapter.exists(temporaryPath)) await adapter.remove(temporaryPath);
		} catch {
			// A failed cleanup must not mask the original error. The next download overwrites it.
		}
	}

	return wasm;
}
