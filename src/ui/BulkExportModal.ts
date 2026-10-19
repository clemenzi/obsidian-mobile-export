import {
	App,
	ButtonComponent,
	Modal,
	Notice,
	Platform,
	Setting,
	TAbstractFile,
	TFolder,
} from "obsidian";
import { t } from "../i18n";
import {
	prepareBulkExport,
	type BulkDeliveryMode,
	type PreparedBulkExport,
} from "../utils/bulkExport";
import { archiveName, collectMarkdownFiles } from "../utils/exportTargets";
import { deliverExportFile } from "../utils/export";
import { canShareFiles, shareFiles, supportsMultipleFiles } from "../utils/share";
import { ExportOptionsForm } from "./ExportOptionsForm";

export class BulkExportModal extends Modal {
	private includeSubfolders = true;
	private mode: BulkDeliveryMode = "zip";
	private form!: ExportOptionsForm;
	private configuration!: HTMLElement;
	private summary!: HTMLElement;
	private status!: HTMLElement;
	private deliverySetting?: Setting;
	private exportButton!: ButtonComponent;
	private noteCount = 0;
	private cancelButton!: ButtonComponent;
	private controller?: AbortController;
	private prepared?: PreparedBulkExport;
	private sharing = false;

	constructor(
		app: App,
		private readonly targets: TAbstractFile[],
	) {
		super(app);
	}

	private get scopeName(): string {
		return this.targets.length === 1 ? this.targets[0]!.name || t("selection") : t("selection");
	}

	onOpen(): void {
		this.modalEl.addClass("mobile-export-modal");
		this.setTitle(t("bulkTitle"));
		this.summary = this.contentEl.createEl("p");
		this.configuration = this.contentEl.createDiv();
		if (this.targets.some((target) => target instanceof TFolder)) {
			new Setting(this.configuration).setName(t("includeSubfolders")).addToggle((toggle) =>
				toggle.setValue(true).onChange((value) => {
					this.includeSubfolders = value;
					this.updateScope();
				}),
			);
		}
		this.form = new ExportOptionsForm(this.configuration, () => this.updateDelivery());
		if (Platform.isMobile) {
			this.deliverySetting = new Setting(this.configuration).setName(t("deliveryMode"));
			this.updateDelivery();
		}
		this.status = this.contentEl.createDiv({ attr: { role: "status", "aria-live": "polite" } });
		new Setting(this.contentEl)
			.addButton((button) => {
				this.cancelButton = button;
				button.setButtonText(t("cancel")).onClick(() => {
					if (this.controller) {
						this.controller.abort();
						button.setDisabled(true);
					} else this.close();
				});
			})
			.addButton((button) => {
				this.exportButton = button;
				button.setCta().onClick(() => {
					if (this.prepared) void this.deliver();
					else void this.prepare();
				});
			});
		this.updateScope();
	}

	onClose(): void {
		this.controller?.abort();
		this.controller = undefined;
		this.prepared = undefined;
		this.contentEl.empty();
	}

	private updateScope(): void {
		const files = collectMarkdownFiles(this.targets, this.includeSubfolders);
		const folders = new Set(files.map((file) => file.parent?.path));
		this.summary.setText(
			`${this.scopeName}: ${t("noteCount", String(files.length))}, ${t("folderCount", String(folders.size))}`,
		);
		this.noteCount = files.length;
		if (!files.length) this.summary.setText(t("noMarkdown"));
		this.updateActions();
	}

	private updateDelivery(): void {
		if (!this.deliverySetting) return;
		const supported = supportsMultipleFiles(this.form.options.type);
		if (!supported) this.mode = "zip";
		this.deliverySetting.controlEl.empty();
		this.deliverySetting.setDesc(t(supported ? "shareDestinations" : "zipFallback"));
		this.deliverySetting.addDropdown((dropdown) => {
			dropdown.addOption("zip", t("exportZip"));
			if (supported) dropdown.addOption("share-files", t("shareFiles"));
			dropdown.setValue(this.mode).onChange((value) => {
				this.mode = value === "share-files" ? "share-files" : "zip";
			});
		});
	}

	private updateActions(): void {
		const busy = !!this.controller || this.sharing;
		let label = t("export");
		if (this.prepared) {
			label = t(
				this.prepared.mode === "share-files"
					? "shareFiles"
					: Platform.isMobile
						? "shareZip"
						: "downloadZip",
			);
		}
		this.exportButton.setButtonText(label).setDisabled(busy || (!this.prepared && !this.noteCount));
		this.cancelButton.setDisabled(this.sharing);
	}

	private async prepare(): Promise<void> {
		if (this.controller || this.sharing) return;
		const files = collectMarkdownFiles(this.targets, this.includeSubfolders);
		if (!files.length) {
			this.status.setText(t("noMarkdown"));
			return;
		}
		const controller = new AbortController();
		this.controller = controller;
		this.prepared = undefined;
		this.status.empty();
		this.configuration.hide();
		this.updateActions();
		try {
			const report = await prepareBulkExport(
				this.app,
				files,
				this.targets,
				this.form.options,
				this.mode,
				archiveName(this.scopeName),
				(progress) => {
					if (!controller.signal.aborted)
						this.status.setText(
							t(
								"bulkProgress",
								`${progress.completed} / ${progress.total}: ${progress.currentFile}`,
							),
						);
				},
				controller.signal,
			);
			if (controller.signal.aborted) return;
			this.prepared = report.result ?? undefined;
			this.status.setText(
				`${t("bulkResult")} ${t("successfulCount", String(report.succeeded))}, ${t("failedCount", String(report.failures.length))}.`,
			);
			if (report.failures.length) {
				const list = this.status.createEl("ul");
				for (const failure of report.failures)
					list.createEl("li", { text: `${failure.path}: ${failure.reason}` });
			}
		} catch (error) {
			if (!controller.signal.aborted) {
				console.error("Failed to prepare bulk export", error);
				this.status.setText(t("exportFailed"));
			}
		} finally {
			// Closing invalidates this run; never update a closed/reopened modal.
			if (this.controller === controller) {
				this.controller = undefined;
				if (controller.signal.aborted) this.status.setText(t("exportCancelled"));
				if (!this.prepared) this.configuration.show();
				this.updateScope();
			}
		}
	}

	private async deliver(): Promise<void> {
		const prepared = this.prepared;
		if (!prepared || this.sharing || this.controller) return;
		this.sharing = true;
		this.updateActions();
		try {
			if (Platform.isMobile) {
				const files = prepared.mode === "zip" ? [prepared.archive] : prepared.files;
				if (!canShareFiles(files)) {
					new Notice(t(prepared.mode === "zip" ? "zipUnsupported" : "filesUnsupported"));
					return;
				}
				// Called directly from this button's click, before awaiting any work.
				await shareFiles(files, this.scopeName);
			} else if (prepared.mode === "zip") await deliverExportFile(prepared.archive);
			this.close();
		} catch (error) {
			if (!(error instanceof Error && error.name === "AbortError")) {
				console.error("Failed to deliver bulk export", error);
				new Notice(t("exportFailed"));
			}
		} finally {
			this.sharing = false;
			if (this.prepared === prepared) this.updateActions();
		}
	}
}
