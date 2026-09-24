import { getLanguage } from "obsidian";

const translations = {
	en: {
		exportFile: "Export file",
		noFile: "No file found to export.",
		modalTitle: (fileName: string) => `Export ${fileName}`,
		fileType: "File type",
		fileTypeDescription: "Select the file type to export as.",
		export: "Export",
		exportFailed: "Export failed. See the console for details.",
	},
	it: {
		exportFile: "Esporta file",
		noFile: "Nessun file da esportare.",
		modalTitle: (fileName: string) => `Esporta ${fileName}`,
		fileType: "Tipo di file",
		fileTypeDescription: "Seleziona il formato in cui esportare il file.",
		export: "Esporta",
		exportFailed: "Esportazione non riuscita. Controlla la console per i dettagli.",
	},
};

type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, ...args: string[]): string {
	const language = getLanguage().toLowerCase().split("-")[0];
	const locale = language === "it" ? translations.it : translations.en;
	const value = locale[key] as string | ((...values: string[]) => string);
	return typeof value === "function" ? value(...args) : value;
}
