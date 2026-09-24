import { App, Modal, Notice, Setting, TFile } from "obsidian";
import { exportFile } from "../utils/export";
import { DEFAULT_PDF_OPTIONS, PDF_PAGE_SIZES, isPdfPageSize, type ExportOptions } from "../exportOptions";
import { t } from "../i18n";

export class ExportModal extends Modal {
  private fileType: ExportOptions["type"] = "pdf";
  private pdfOptions = { ...DEFAULT_PDF_OPTIONS };

  constructor(app: App, private readonly file: TFile) {
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
          });
      });

    const pdfSettings = this.contentEl.createDiv();

    new Setting(pdfSettings)
      .setName(t("includeTitle"))
      .setDesc(t("includeTitleDescription"))
      .addToggle((toggle) => toggle.setValue(this.pdfOptions.includeTitle).onChange((value) => {
        this.pdfOptions.includeTitle = value;
      }));

    new Setting(pdfSettings)
      .setName(t("pageSize"))
      .setDesc(t("pageSizeDescription"))
      .addDropdown((dropdown) => {
        for (const size of PDF_PAGE_SIZES) {
          dropdown.addOption(size, size.charAt(0).toUpperCase() + size.slice(1));
        }
        dropdown.setValue(this.pdfOptions.pageSize).onChange((value) => {
          if (isPdfPageSize(value)) this.pdfOptions.pageSize = value;
        });
      });

    new Setting(pdfSettings)
      .setName(t("landscape"))
      .setDesc(t("landscapeDescription"))
      .addToggle((toggle) => toggle.setValue(this.pdfOptions.landscape).onChange((value) => {
        this.pdfOptions.landscape = value;
      }));

    new Setting(pdfSettings)
      .setName(t("margin"))
      .setDesc(t("marginDescription"))
      .addDropdown((dropdown) => dropdown
        .addOption("10", t("marginNarrow"))
        .addOption("38", t("marginNormal"))
        .addOption("76", t("marginWide"))
        .setValue(String(this.pdfOptions.margin))
        .onChange((value) => {
          this.pdfOptions.margin = Number(value);
        }));

    const scaleSetting = new Setting(pdfSettings)
      .setName(t("scale"))
      .setDesc(t("scaleDescription"));
    scaleSetting.addSlider((slider) => slider
        .setLimits(50, 100, 10)
        .setValue(this.pdfOptions.scale)
        .onChange((value) => {
          this.pdfOptions.scale = value;
        }));

    new Setting(this.contentEl)
      .addButton((button) => button
        .setButtonText(t("cancel"))
        .onClick(() => this.close()))
      .addButton((button) => {
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
      const options: ExportOptions = this.fileType === "pdf" ? this.pdfOptions : { type: "html" };
      await exportFile(content, this.file, options);
      this.close();
    } catch (error) {
      console.error("Failed to export file", error);
      new Notice(t("exportFailed"));
    }
  }
}
