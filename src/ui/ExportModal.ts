import { App, ButtonComponent, Modal, Notice, Platform, Setting, TFile } from "obsidian";
import { createExportFile, deliverExportFile } from "../utils/export";
import type { ExportOptions } from "../exportOptions";
import { ExportOptionsForm } from "./ExportOptionsForm";
import { t } from "../i18n";

export class ExportModal extends Modal {
	private form!: ExportOptionsForm;
	private exportButton?: ButtonComponent;
	private preparedFile?: File;
	private preparation = Promise.resolve();
	private revision = 0;

	constructor(
		app: App,
		private readonly file: TFile,
	) {
		super(app);
	}

	onOpen(): void {
		this.modalEl.addClass("mobile-export-modal");
		this.setTitle(t("modalTitle"));

		this.contentEl.createEl("p", {
			cls: "mobile-export-description",
			text: t("modalDescription", this.file.basename),
		});

		this.form = new ExportOptionsForm(this.contentEl, () => this.prepare());

		new Setting(this.contentEl)
			.addButton((button) => button.setButtonText(t("cancel")).onClick(() => this.close()))
			.addButton((button) => {
				this.exportButton = button;
				button
					.setButtonText(t("export"))
					.setCta()
					.onClick(() => void this.export());
			});

		this.prepare();
	}

	onClose(): void {
		this.revision++;
		this.preparedFile = undefined;
		this.contentEl.empty();
	}

	private async createFile(options: ExportOptions): Promise<File> {
		const content = await this.app.vault.read(this.file);
		return createExportFile(content, this.app, this.file, options);
	}

	private prepare(): void {
		if (!Platform.isMobile) return;
		const revision = ++this.revision;
		const options = this.form.options;
		this.preparedFile = undefined;
		this.exportButton?.setDisabled(true);

		// Prepare before the tap to preserve Web Share's user gesture; serialize PDF rendering.
		this.preparation = this.preparation.then(async () => {
			if (revision !== this.revision) return;
			try {
				const file = await this.createFile(options);
				if (revision !== this.revision) return;
				this.preparedFile = file;
				this.exportButton?.setDisabled(false);
			} catch (error) {
				if (revision === this.revision) this.reportFailure(error);
			}
		});
	}

	private async export(): Promise<void> {
		try {
			if (Platform.isMobile) {
				if (!this.preparedFile) return;
				await deliverExportFile(this.preparedFile);
			} else {
				await deliverExportFile(await this.createFile(this.form.options));
			}
			this.close();
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") return;
			this.reportFailure(error);
		}
	}

	private reportFailure(error: unknown): void {
		console.error("Failed to export file", error);
		new Notice(t("exportFailed"));
	}
}
