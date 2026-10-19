import { Notice, Platform, TFile, TFolder, TAbstractFile, Modal } from "obsidian";
import { BulkExportModal } from "../ui/BulkExportModal";
import { ExportModal } from "../ui/ExportModal";
import { t } from "../i18n";
import type MobileExportPlugin from "../main";

export function registerExportMenus(plugin: MobileExportPlugin): void {
	const isEnabled = () => Platform.isMobile || plugin.settings.enableOnDesktop;

	const openExport = (targets: TAbstractFile[]): void => {
		if (!isEnabled()) return;
		const first = targets[0];
		const modal: Modal =
			targets.length === 1 && first instanceof TFile && first.extension.toLowerCase() === "md"
				? new ExportModal(plugin.app, first)
				: new BulkExportModal(plugin.app, targets);
		plugin.register(() => modal.close());
		modal.open();
	};

	plugin.registerEvent(
		plugin.app.workspace.on("file-menu", (menu, file) => {
			if (
				!isEnabled() ||
				!(file instanceof TFolder || (file instanceof TFile && file.extension === "md"))
			)
				return;

			menu.addItem((item) => {
				item
					.setTitle(t(file instanceof TFolder ? "bulkTitle" : "exportContext"))
					.setIcon("document")
					.onClick(() => {
						openExport([file]);
					});
			});
		}),
	);

	plugin.registerEvent(
		plugin.app.workspace.on("files-menu", (menu, files) => {
			if (!isEnabled() || !files.length) return;
			menu.addItem((item) =>
				item
					.setTitle(t("bulkTitle"))
					.setIcon("document")
					.onClick(() => openExport(files)),
			);
		}),
	);

	plugin.registerEvent(
		plugin.app.workspace.on("editor-menu", (menu, _editor, view) => {
			if (!isEnabled()) return;
			menu.addItem((item) => {
				item
					.setTitle(t("exportContext"))
					.setIcon("document")
					.onClick(() => {
						if (!isEnabled()) return;
						if (!view.file) {
							new Notice(t("noFile"));
							return;
						}

						openExport([view.file]);
					});
			});
		}),
	);

	plugin.addCommand({
		id: "export-current-file",
		name: t("exportFile"),
		checkCallback: (checking) => {
			if (!isEnabled()) return false;
			if (checking) return true;

			const activeFile = plugin.app.workspace.getActiveFile();
			if (!activeFile) {
				new Notice(t("noFile"));
				return true;
			}

			openExport([activeFile]);
			return true;
		},
	});
}
