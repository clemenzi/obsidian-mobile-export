import { Notice, Platform, TFile } from "obsidian";
import { ExportModal } from "../ui/ExportModal";
import { t } from "../i18n";
import type MobileExportPlugin from "../main";

export function registerExportMenus(plugin: MobileExportPlugin): void {
	const isEnabled = () => Platform.isMobile || plugin.settings.enableOnDesktop;

	plugin.registerEvent(
		plugin.app.workspace.on("file-menu", (menu, file) => {
			if (!isEnabled() || !(file instanceof TFile) || file.extension !== "md") return;

			menu.addItem((item) => {
				item
					.setTitle(t("exportContext"))
					.setIcon("document")
					.onClick(() => {
						if (isEnabled()) new ExportModal(plugin.app, file).open();
					});
			});
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

						new ExportModal(plugin.app, view.file).open();
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

			new ExportModal(plugin.app, activeFile).open();
			return true;
		},
	});
}
