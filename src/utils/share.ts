export function canShareFiles(files: File[]): boolean {
	try {
		return typeof navigator.share === "function" && navigator.canShare?.({ files }) === true;
	} catch {
		return false;
	}
}

export function supportsMultipleFiles(type: "pdf" | "html"): boolean {
	const mime = type === "pdf" ? "application/pdf" : "text/html";
	return canShareFiles([
		new File(["export"], `Note 1.${type}`, { type: mime }),
		new File(["export"], `Note 2.${type}`, { type: mime }),
	]);
}

export async function shareFiles(files: File[], title: string): Promise<void> {
	if (!canShareFiles(files)) throw new Error("File sharing is not supported on this device");
	await navigator.share({ files, title });
}
