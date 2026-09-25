import { getLanguage } from "obsidian";

const translations = {
  en: {
    exportFile: "Export file",
    noFile: "No file found to export.",
    enableOnDesktop: "Enable on desktop",
    enableOnDesktopDescription: "Show export options in context menus on desktop. Mobile is always enabled.",
    modalTitle: "Export note",
    modalDescription: (fileName: string) => `Export “${fileName}”`,
    fileType: "File type",
    fileTypeDescription: "Select the file type to export as.",
    includeTitle: "Include file name as title",
    includeTitleDescription: "Add the note’s file name at the beginning of the exported document.",
    pageSize: "Page size",
    pageSizeDescription: "Choose the paper size for the PDF.",
    landscape: "Landscape",
    landscapeDescription: "Use a horizontal page layout instead of a vertical one.",
    margin: "Margin",
    marginDescription: "Set the blank space around the page content.",
    marginNarrow: "Narrow",
    marginNormal: "Normal",
    marginWide: "Wide",
    scale: "Scale (%)",
    scaleDescription: "Adjust the PDF content size. 100% uses the original size.",
    cancel: "Cancel",
    export: "Export",
    exportFailed: "Export failed. See the console for details.",
  },
  it: {
    exportFile: "Esporta file",
    noFile: "Nessun file da esportare.",
    enableOnDesktop: "Attiva su desktop",
    enableOnDesktopDescription: "Mostra le opzioni di esportazione nei menu contestuali su desktop. Su mobile sono sempre disponibili.",
    modalTitle: "Esporta nota",
    modalDescription: (fileName: string) => `Esporta “${fileName}”`,
    fileType: "Tipo di file",
    fileTypeDescription: "Seleziona il formato in cui esportare il file.",
    includeTitle: "Includi nome file come titolo",
    includeTitleDescription: "Aggiunge il nome del file all’inizio del documento esportato.",
    pageSize: "Dimensione pagina",
    pageSizeDescription: "Scegli il formato della pagina del PDF.",
    landscape: "Orizzontale",
    landscapeDescription: "Imposta la pagina in orizzontale anziché in verticale.",
    margin: "Margine",
    marginDescription: "Imposta lo spazio vuoto intorno al contenuto della pagina.",
    marginNarrow: "Stretto",
    marginNormal: "Normale",
    marginWide: "Ampio",
    scale: "Riduzione in percentuale",
    scaleDescription: "Regola le dimensioni del contenuto del PDF. Il 100% mantiene le dimensioni originali.",
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
