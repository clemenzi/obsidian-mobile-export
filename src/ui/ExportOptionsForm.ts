import { Setting } from "obsidian";
import {
	DEFAULT_PDF_OPTIONS,
	PDF_PAGE_SIZES,
	isPdfPageSize,
	type ExportOptions,
} from "../exportOptions";
import { t } from "../i18n";

export class ExportOptionsForm {
	private fileType: ExportOptions["type"] = "pdf";
	private pdfOptions = { ...DEFAULT_PDF_OPTIONS };

	get options(): ExportOptions {
		return this.fileType === "pdf" ? { ...this.pdfOptions } : { type: "html" };
	}

	constructor(container: HTMLElement, onChange: () => void) {
		new Setting(container)
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
						onChange();
					});
			});

		const pdfSettings = container.createDiv();

		new Setting(pdfSettings)
			.setName(t("includeTitle"))
			.setDesc(t("includeTitleDescription"))
			.addToggle((toggle) =>
				toggle.setValue(this.pdfOptions.includeTitle).onChange((value) => {
					this.pdfOptions.includeTitle = value;
					onChange();
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
						onChange();
					}
				});
			});

		new Setting(pdfSettings)
			.setName(t("landscape"))
			.setDesc(t("landscapeDescription"))
			.addToggle((toggle) =>
				toggle.setValue(this.pdfOptions.landscape).onChange((value) => {
					this.pdfOptions.landscape = value;
					onChange();
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
						onChange();
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
					onChange();
				}),
		);
	}
}
