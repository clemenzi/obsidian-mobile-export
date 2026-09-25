import { PluginSettingTab, Setting, type App } from "obsidian";
import { t } from "./i18n";
import type MobileExportPlugin from "./main";

export interface MobileExportSettings {
	enableOnDesktop: boolean;
}

export const DEFAULT_SETTINGS: MobileExportSettings = {
	enableOnDesktop: true,
};

export class MobileExportSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: MobileExportPlugin) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();

		new Setting(this.containerEl)
			.setName(t("enableOnDesktop"))
			.setDesc(t("enableOnDesktopDescription"))
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.enableOnDesktop)
				.onChange(async (value) => {
					this.plugin.settings.enableOnDesktop = value;
					await this.plugin.saveData(this.plugin.settings);
				}));
	}
}
