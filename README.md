# Mobile Export

Mobile Export is an Obsidian plugin for exporting notes as PDF or HTML on mobile devices.

## Usage

Open the context menu for a note or inside the editor, then select **Export**. Choose PDF or HTML and select **Export**. For PDF, you can include the file name as a title and adjust page size, orientation, margins, and text scale.

## Settings

In **Settings → Community plugins → Mobile Export**, turn off **Enable on desktop** to hide the plugin’s export options from desktop context menus. Export options remain available on mobile. The setting is on by default and takes effect immediately.

## Development

Install dependencies and build the plugin with npm:

```bash
npm install
npm run dev
```

For a production build, run `npm run build`. The build creates `main.js` in the plugin folder.
