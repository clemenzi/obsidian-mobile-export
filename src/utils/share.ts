export function canShareFiles(files: File[]): boolean {
	try {
		return typeof navigator.share === "function" && navigator.canShare?.({ files }) === true;
	} catch {
		return false;
	}
}

export async function shareFiles(files: File[], title: string): Promise<void> {
	if (!canShareFiles(files)) throw new Error("File sharing is not supported on this device");
	await navigator.share({ files, title });
}
