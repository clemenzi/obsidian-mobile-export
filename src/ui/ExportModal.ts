import { App, Modal, Notice, Setting, TFile } from "obsidian";
import { exportFile, ExportFileType } from "../utils/export";
import { t } from "../i18n";

export class ExportModal extends Modal {
	private fileType: ExportFileType = "pdf";

	constructor(app: App, private readonly file: TFile) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(t("modalTitle", this.file.name));

		new Setting(this.contentEl)
			.setName(t("fileType"))
			.setDesc(t("fileTypeDescription"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("pdf", "PDF")
					.addOption("html", "HTML")
					.setValue(this.fileType)
					.onChange((value) => {
						this.fileType = value as ExportFileType;
					});
			});

		new Setting(this.contentEl).addButton((button) => {
			button
				.setButtonText(t("export"))
				.setCta()
				.onClick(() => void this.export());
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async export(): Promise<void> {
		try {
			const content = await this.app.vault.read(this.file);
			await exportFile(content, this.file, this.fileType);
			this.close();
		} catch (error) {
			console.error("Failed to export file", error);
			new Notice(t("exportFailed"));
		}
	}
}
