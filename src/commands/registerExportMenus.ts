import { Notice, Platform, TFile } from "obsidian";
import { ExportModal } from "../ui/ExportModal";
import { t } from "../i18n";
import type MobileExportPlugin from "../main";

export function registerExportMenus(plugin: MobileExportPlugin): void {
	if (!Platform.isMobile && !plugin.settings.enableOnDesktop) return;

	plugin.registerEvent(
		plugin.app.workspace.on("file-menu", (menu, file) => {
			if (!(file instanceof TFile) || file.extension !== "md") return;

			menu.addItem((item) => {
				item
					.setTitle(t("exportContext"))
					.setIcon("document")
					.onClick(() => new ExportModal(plugin.app, file).open());
			});
		}),
	);

	plugin.registerEvent(
		plugin.app.workspace.on("editor-menu", (menu, _editor, view) => {
			menu.addItem((item) => {
				item
					.setTitle(t("exportContext"))
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

  plugin.addCommand({
    id: "export-current-file",
    name: t("exportFile"),
    callback: () => {
      const activeFile = plugin.app.workspace.getActiveFile();

      if (!activeFile) {
        new Notice(t("noFile"));
        return;
      }

      new ExportModal(plugin.app, activeFile).open();
    },
  })
}
