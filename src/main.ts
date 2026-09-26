import { Plugin } from "obsidian";
import { registerExportMenus } from "./commands/registerExportMenus";
import { DEFAULT_SETTINGS, MobileExportSettingTab, type MobileExportSettings } from "./settings";

export default class MobileExportPlugin extends Plugin {
	settings: MobileExportSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		const saved: unknown = await this.loadData();
		const enableOnDesktop =
			saved && typeof saved === "object" && "enableOnDesktop" in saved
				? saved.enableOnDesktop
				: undefined;
		this.settings = {
			...DEFAULT_SETTINGS,
			...(typeof enableOnDesktop === "boolean" ? { enableOnDesktop } : {}),
		};

		this.addSettingTab(new MobileExportSettingTab(this.app, this));
		registerExportMenus(this);
	}
}
