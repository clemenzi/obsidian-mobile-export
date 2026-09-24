import type { PageSizeName } from "takumi-pdf/no-init";

export const PDF_PAGE_SIZES = ["a3", "a4", "a5", "letter", "legal"] as const satisfies readonly PageSizeName[];
export type PdfPageSize = (typeof PDF_PAGE_SIZES)[number];

export type ExportOptions =
	| { type: "html" }
	| {
			type: "pdf";
			includeTitle: boolean;
			pageSize: PdfPageSize;
			landscape: boolean;
			margin: number;
			scale: number;
		};

export const DEFAULT_PDF_OPTIONS: Extract<ExportOptions, { type: "pdf" }> = {
	type: "pdf",
	includeTitle: false,
	pageSize: "letter",
	landscape: false,
	margin: 38,
	scale: 100,
};

export function isPdfPageSize(value: string): value is PdfPageSize {
	return PDF_PAGE_SIZES.some((size) => size === value);
}
