import { Plugin } from "obsidian";
import { registerExportMenus } from "./commands/registerExportMenus";
import { DEFAULT_SETTINGS, MobileExportSettingTab, type MobileExportSettings } from "./settings";

export default class MobileExportPlugin extends Plugin {
	settings: MobileExportSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		const saved: unknown = await this.loadData();
		this.settings = {
			enableOnDesktop: saved && typeof saved === "object" && "enableOnDesktop" in saved
				&& typeof saved.enableOnDesktop === "boolean"
					? saved.enableOnDesktop
					: DEFAULT_SETTINGS.enableOnDesktop,
		};
		this.addSettingTab(new MobileExportSettingTab(this.app, this));
		registerExportMenus(this);
	}
}
