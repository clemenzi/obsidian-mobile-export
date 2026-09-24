import { Plugin } from "obsidian";
import { registerExportMenus } from "./commands/registerExportMenus";

export default class MobileExportPlugin extends Plugin {
	onload() {
		registerExportMenus(this);
	}
}
