import { getLanguage } from "obsidian";

const translations = {
  en: {
    exportFile: "Export file",
    noFile: "No file found to export.",
    modalTitle: "Export note",
    modalDescription: (fileName: string) => `Export “${fileName}”`,
    fileType: "File type",
    fileTypeDescription: "Select the file type to export as.",
    includeTitle: "Include file name as title",
    pageSize: "Page size",
    landscape: "Landscape",
    margin: "Margin",
    marginNarrow: "Narrow",
    marginNormal: "Normal",
    marginWide: "Wide",
    scale: "Scale (%)",
    cancel: "Cancel",
    export: "Export",
    exportFailed: "Export failed. See the console for details.",
  },
  it: {
    exportFile: "Esporta file",
    noFile: "Nessun file da esportare.",
    modalTitle: "Esporta nota",
    modalDescription: (fileName: string) => `Esporta “${fileName}”`,
    fileType: "Tipo di file",
    fileTypeDescription: "Seleziona il formato in cui esportare il file.",
    includeTitle: "Includi nome file come titolo",
    pageSize: "Dimensione pagina",
    landscape: "Orizzontale",
    margin: "Margine",
    marginNarrow: "Stretto",
    marginNormal: "Normale",
    marginWide: "Ampio",
    scale: "Riduzione in percentuale",
    cancel: "Annulla",
    export: "Esporta",
    exportFailed: "Esportazione non riuscita. Controlla la console per i dettagli.",
  },
};

type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, fileName = ""): string {
  const language = getLanguage().toLowerCase().split("-")[0];
  const locale = language === "it" ? translations.it : translations.en;
  const value = locale[key];
  return typeof value === "function" ? value(fileName) : value;
}
