import { App, ButtonComponent, Modal, Notice, Platform, Setting, TFile } from "obsidian";
import { createExportFile, deliverExportFile } from "../utils/export";
import {
	DEFAULT_PDF_OPTIONS,
	PDF_PAGE_SIZES,
	isPdfPageSize,
	type ExportOptions,
} from "../exportOptions";
import { t } from "../i18n";

export class ExportModal extends Modal {
	private fileType: ExportOptions["type"] = "pdf";
	private pdfOptions = { ...DEFAULT_PDF_OPTIONS };
	private exportButton?: ButtonComponent;
	private preparedFile?: File;
	private preparation = Promise.resolve();
	private revision = 0;

	private get options(): ExportOptions {
		return this.fileType === "pdf" ? { ...this.pdfOptions } : { type: "html" };
	}

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

		new Setting(this.contentEl)
			.setName(t("fileType"))
			.setDesc(t("fileTypeDescription"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("pdf", "PDF")
					.addOption("html", "HTML")
					.setValue(this.fileType)
					.onChange((value) => {
						this.fileType = value as ExportOptions["type"];
						pdfSettings.style.display = this.fileType === "pdf" ? "" : "none";
						this.prepare();
					});
			});

		const pdfSettings = this.contentEl.createDiv();

		new Setting(pdfSettings)
			.setName(t("includeTitle"))
			.setDesc(t("includeTitleDescription"))
			.addToggle((toggle) =>
				toggle.setValue(this.pdfOptions.includeTitle).onChange((value) => {
					this.pdfOptions.includeTitle = value;
					this.prepare();
				}),
			);

		new Setting(pdfSettings)
			.setName(t("pageSize"))
			.setDesc(t("pageSizeDescription"))
			.addDropdown((dropdown) => {
				for (const size of PDF_PAGE_SIZES) {
					dropdown.addOption(size, size.charAt(0).toUpperCase() + size.slice(1));
				}
				dropdown.setValue(this.pdfOptions.pageSize).onChange((value) => {
					if (isPdfPageSize(value)) {
						this.pdfOptions.pageSize = value;
						this.prepare();
					}
				});
			});

		new Setting(pdfSettings)
			.setName(t("landscape"))
			.setDesc(t("landscapeDescription"))
			.addToggle((toggle) =>
				toggle.setValue(this.pdfOptions.landscape).onChange((value) => {
					this.pdfOptions.landscape = value;
					this.prepare();
				}),
			);

		new Setting(pdfSettings)
			.setName(t("margin"))
			.setDesc(t("marginDescription"))
			.addDropdown((dropdown) =>
				dropdown
					.addOption("10", t("marginNarrow"))
					.addOption("38", t("marginNormal"))
					.addOption("76", t("marginWide"))
					.setValue(String(this.pdfOptions.margin))
					.onChange((value) => {
						this.pdfOptions.margin = Number(value);
						this.prepare();
					}),
			);

		const scaleSetting = new Setting(pdfSettings)
			.setName(t("scale"))
			.setDesc(t("scaleDescription"));
		scaleSetting.addSlider((slider) =>
			slider
				.setLimits(50, 100, 10)
				.setValue(this.pdfOptions.scale)
				.onChange((value) => {
					this.pdfOptions.scale = value;
					this.prepare();
				}),
		);

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
		const options = this.options;
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
				await deliverExportFile(await this.createFile(this.options));
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
