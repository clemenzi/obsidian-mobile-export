import { Zip, ZipPassThrough } from "fflate";

/** Add one rendered document at a time; retain only ZIP chunks for the final File. */
export class ExportZip {
	private chunks: BlobPart[] = [];
	private error?: Error;
	private zip = new Zip((error, chunk) => {
		if (error) this.error = error;
		else this.chunks.push(chunk);
	});

	add(path: string, data: Uint8Array): void {
		const entry = new ZipPassThrough(path);
		this.zip.add(entry);
		entry.push(data, true);
		if (this.error) throw this.error;
	}

	finish(name: string): File {
		this.zip.end();
		if (this.error) throw this.error;
		const file = new File(this.chunks, name, { type: "application/zip" });
		this.dispose();
		return file;
	}

	dispose(): void {
		this.zip.terminate();
		this.chunks = [];
	}
}
