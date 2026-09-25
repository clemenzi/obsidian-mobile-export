import { Plugin } from "obsidian";
import { registerExportMenus } from "./commands/registerExportMenus";
import { DEFAULT_SETTINGS, MobileExportSettingTab, type MobileExportSettings } from "./settings";

export default class MobileExportPlugin extends Plugin {
	settings: MobileExportSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		const saved: unknown = await this.loadData();
		this.settings = { ...DEFAULT_SETTINGS };

		if (saved && typeof saved === "object" && "enableOnDesktop" in saved) {
			const enableOnDesktop = saved.enableOnDesktop;

			if (typeof enableOnDesktop === "boolean") {
				this.settings.enableOnDesktop = enableOnDesktop;
			}
		}

		this.addSettingTab(new MobileExportSettingTab(this.app, this));
		registerExportMenus(this);
	}
}
