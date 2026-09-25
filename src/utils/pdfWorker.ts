import init, { render } from "takumi-pdf/no-init";
import type { ExportOptions } from "../exportOptions";

type PdfOptions = Extract<ExportOptions, { type: "pdf" }>;

self.onmessage = async (event: MessageEvent<{ html: string; title: string; options: PdfOptions; wasm: ArrayBuffer }>) => {
	try {
		await init({ module_or_path: event.data.wasm });
		const { html, title, options } = event.data;
		const pdf = await render(html, {
			size: options.pageSize,
			landscape: options.landscape,
			margin: options.margin,
			metadata: { title },
		});
		const bytes = new Uint8Array(pdf);
		self.postMessage({ bytes: bytes.buffer }, { transfer: [bytes.buffer] });
	} catch (error) {
		self.postMessage({ error: error instanceof Error ? error.message : String(error) });
	}
};
