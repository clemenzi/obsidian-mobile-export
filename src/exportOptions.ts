import type { PageSizeName } from "takumi-pdf/no-init";

export const PDF_PAGE_SIZES = ["a3", "a4", "a5", "letter", "legal"] as const satisfies readonly PageSizeName[];
export type PdfPageSize = (typeof PDF_PAGE_SIZES)[number];

export type ExportOptions =
	| { type: "html"; language: string }
	| { type: "pdf"; pageSize: PdfPageSize; landscape: boolean; margin: number };

export function isPdfPageSize(value: string): value is PdfPageSize {
	return PDF_PAGE_SIZES.some((size) => size === value);
}
