# PDF WASM maintenance

## Build and upgrade

`package.json` is the authoritative Takumi version. Keep `takumi-pdf` pinned to an exact version and commit the updated `pnpm-lock.yaml` when upgrading it. Install with `pnpm install --frozen-lockfile` for CI/releases.

`scripts/takumi-metadata.mjs` resolves the WASM exported by the installed npm package, checks that its version matches the dependency, validates the binary, and computes SHA-256. esbuild embeds only the version and digest in `main.js`; it does not bundle the WASM. The digest comes from the build dependency protected by the lockfile's package integrity, never from the runtime CDN response. This protects against a different CDN/cache artifact, but still trusts the npm package and build environment.

A version range, stale installation, or invalid installed WASM fails the build. Restart the development watcher after changing dependencies. Run:

```sh
pnpm install --frozen-lockfile
npm test
npm run build
npm run lint
wc -c main.js
```

Keep the production bundle below 5,000,000 bytes for the Sync constraint in issue #2. The automated tests bundle browser-targeted code and use the real installed JS wrapper, WASM, and fonts to generate PDFs, including in a fresh offline session. They mock only the Obsidian adapter and network boundary. They also cover integrity failures, cache repair, interrupted storage writes, HTTP/offline failures, and initialization retries. These Node tests do not replace device checks on iOS and Android.

## Runtime and recovery

The loader uses Obsidian's `requestUrl` and vault adapter, plus browser WebAssembly and Web Crypto APIs. It has no runtime Node dependency. Every cached or downloaded module must pass WASM validation and match the build's SHA-256 before initialization.

A missing, unreadable, or invalid cache triggers a download of that exact version from jsDelivr. A valid download is written to a temporary file and read back for verification before replacing an invalid cache. Failed writes clean up the temporary file where storage permissions permit; the next attempt overwrites any leftover temporary file. Download and integrity failures leave the existing cache untouched. Older versions are retained for downgrades.

On a first-use/offline, CDN, or integrity failure, reconnect or check CDN access, then reopen the export dialog and retry. Cache write failures require checking vault storage and permissions. After a successful cache write, later sessions can export offline. A plugin upgrade may need another initial download if the pinned Takumi version changes.

The unused root WASM artifact was already removed before this change (`main` at `a6b9b3d`), and `.gitignore` already excludes `*.wasm`. Release artifacts remain `main.js`, `manifest.json`, and `styles.css`.

## Community distribution review

Reviewed on 2026-10-21:

- [Developer policies](https://docs.obsidian.md/community-directory/developer-policies) prohibit plugins from installing or updating themselves or their dependencies, and require disclosure of network use in the README.
- [Submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins) restrict Node/Electron APIs to desktop and recommend Web API alternatives such as SubtleCrypto.
- [Submission instructions](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin) list the three supported release assets; they do not document automatic installation of a separate WASM asset.

The dependency-installation restriction raises a distribution concern for the existing first-use WASM download. These pages do not state an explicit exception for a version-pinned, hash-verified WASM component. This hardening preserves the design requested in issue #11; it does **not** establish that this design is approved for the official community directory. Obtain clarification from Obsidian before treating that question as resolved. If a distribution change is required, evaluate it separately against mobile compatibility and the bundle-size constraint from issue #2.
