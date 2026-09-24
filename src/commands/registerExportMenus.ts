import { Notice, Plugin, TFile } from "obsidian";
import { ExportModal } from "../ui/ExportModal";
import { t } from "../i18n";

export function registerExportMenus(plugin: Plugin): void {
	plugin.registerEvent(
		plugin.app.workspace.on("file-menu", (menu, file) => {
			if (!(file instanceof TFile) || file.extension !== "md") return;

			menu.addItem((item) => {
				item
					.setTitle(t("exportFile"))
					.setIcon("document")
					.onClick(() => new ExportModal(plugin.app, file).open());
			});
		}),
	);

	plugin.registerEvent(
		plugin.app.workspace.on("editor-menu", (menu, _editor, view) => {
			menu.addItem((item) => {
				item
					.setTitle(t("exportFile"))
					.setIcon("document")
					.onClick(() => {
						if (!view.file) {
							new Notice(t("noFile"));
							return;
						}

						new ExportModal(plugin.app, view.file).open();
					});
			});
		}),
	);
}
