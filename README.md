# tiles

A local-first start page for the links you keep close.

**[t128n.github.io/tiles](https://t128n.github.io/tiles/)**

tiles is a small static Svelte app. Everything you add stays in your browser: no account, no server, no sync. Groups keep related links together, folders hold a few links behind one tile, and the whole board is reordered by dragging or from the keyboard.

To make tiles your browser's new tab page, open **Help → Browser setup** in the app (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>?</kbd>).

## What it does

- **Groups** are sections of the page, reordered by their grip handle.
- **Links** are tiles with a site icon, title and hostname.
- **Folders** are tiles that open their links in a popover or a sheet on touch screens.
- **Search on type**: just start typing. One palette lists matching tiles, a web search for the query and commands; Enter runs the highlighted result. The board itself never changes.
- **Palette**: <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> opens the same palette for Add link, Add folder, Add links (when the paste experiment is on), New group, Settings, Help, Export/Import and group jumps.
- **Settings**: <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>,</kbd> for the search engine, theme, link target and the experiments.
- **Help**: <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>?</kbd> or <kbd>Alt</kbd> + <kbd>?</kbd> opens the user guide with browser setup, keyboard shortcuts, data notes and the agent prompt.
- **Experiments**: switchable extras under Settings → Advanced → Experimental. A calculator in the palette, bulk pasting of links, the Hacker News column and a GitHub release tracker.
- **Tabbed sidebars**: with more than one column experiment on, the panels share one column and switch with tabs; the tab you used last comes back after a reload.
- **Full-width dashboard**: groups span the viewport on a 72-column grid, with the tiles wordmark fixed as a watermark in the bottom-right.
- **Ghost add cell**: each group ends with an invisible tile that reveals Add link on hover or keyboard focus.
- **Drag and keyboard reordering** is built with ui-sdk's `createReorder` and `createRovingFocus`: focus a grip handle, press Space, use the arrows, and press Space again.
- **Offline app shell**: a generated service worker precaches the app. Settings compares the local build with the published `version.json`; **Update now** reloads onto the new build, reopens Settings and confirms the update there.
- **Backup**: Settings → Data, or **Export board** / **Import board** in the command palette, exports the board as `tiles-<date>.json` and imports it back behind a validation preview and a confirmation.
- **Undo**: deleting a tile, group or folder link, resetting the board, or importing a backup can be undone for ten seconds from the toast.
- **Destructive actions ask first**, and are marked with `data-agent-confirm` for agents.
- **Agent ready**: the app exposes its controls through ui-sdk's agent bridge, and registers WebMCP tools when the browser supports them.
- **Prompts**: Help → Agent prompts holds the history prompt with one-click copy.

### WebMCP

When `document.modelContext` is available, the app registers:

- `snapshot`, `act`, `query` from ui-sdk's agent bridge;
- `tiles_list`, which returns the current groups, tiles, folder links and URLs;
- `tiles_apply_suggestions`, which previews or adds suggested groups and links.

`tiles_apply_suggestions` defaults to a dry run. Writing requires `dryRun: false`, skips duplicate and invalid URLs, merges into existing groups by title, and asks the person in the page to confirm. It never deletes or reorders anything.

WebMCP is still experimental. If `document.modelContext` is missing, enable the WebMCP feature in the browser and, in some Chrome builds, restart it.

### Suggesting tiles from history

Open **Help → Agent prompts** (<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>?</kbd> or <kbd>Alt</kbd> + <kbd>?</kbd>), copy **Suggest tiles**, and paste it into your agent with any constraints. The prompt lives in [`src/lib/prompts/suggest-tiles.md`](src/lib/prompts/suggest-tiles.md); there are no `.opencode` command files.

It asks which browser and which profiles to read before touching history, finds them with PowerShell or bash, and scans a temporary copy of the profile's `History` SQLite database with a small Node reader on the built-in `node:sqlite`, so nothing has to be installed. It ranks hosts by visits, looks at subdomains and the busiest paths, and asks you to cut the list and name the groups before any list is written. Internal links are opt-in, at most three, and only for sites you use daily; admin, status and dev-server pages are left out.

The run ends with a grouped list of URLs. Turn on **Paste links** under Settings → Advanced → Experimental, then use **Add links…** in the palette once per group. Duplicates already on the board are skipped, and the agent never writes to the board itself. It reports hosts and visits, not page titles or paths, and leaves banking, health and similar private URLs out.

### Keyboard

| Keys | Action |
| --- | --- |
| Any letter | Open the palette and type |
| <kbd>/</kbd> | Open the palette |
| <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>F</kbd> | Open the palette instead of browser find |
| <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> | Open the palette |
| <kbd>Enter</kbd> | Run the highlighted result |
| <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>,</kbd> | Open settings |
| <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>?</kbd> | Open help |
| <kbd>Alt</kbd> + <kbd>?</kbd> | Open help |
| <kbd>Space</kbd> | Pick up or drop a focused grip handle |
| <kbd>Arrow keys</kbd> | Move a picked-up tile or group |
| <kbd>Escape</kbd> | Cancel a move, close a popup |

## Local data

The board is stored as JSON in `localStorage` under `tiles:v1`.

- A corrupt saved board is not overwritten. The app offers to download the raw value or start fresh.
- Export and import move the board between browsers and between `localhost` and the deployed origin, which keep separate storage.
- If the browser blocks storage or is out of space, changes stay in the current tab and a warning appears.
- Site icons try `/apple-touch-icon.png`, `/favicon.ico`, then `/assets/favicon.ico`, and finally a letter tile; no favicon resolver or third-party icon service is used.
- The previous bits-ui version stored notes and tiles under `tiles_app_data`. This is a clean rebuild and does not import that key.
- Settings live under `tiles:settings:v1`.

## Experiments

Every experiment is off until you turn it on in **Settings → Advanced → Experimental**. Each one is a module that declares its settings row and, optionally, one capability: a search resolution, a palette command or a sidebar column.

- **Calculator**: type an expression into the palette, like `18*3` or `sqrt(144)`. The result becomes the first action; choosing it copies the number. Bare numbers are left alone, so `2026` still searches.
- **Paste links**: paste several addresses into the URL field of Add link, or choose **Add links…** in the palette, and they become tiles in one group in a single undoable step. Duplicates and addresses already on the board are skipped.
- **Hacker News**: the front page in the sidebar. It reads `https://hn.algolia.com/api/v1/search?tags=front_page`, the same stories hnrss.org publishes, from the Algolia API. That API is CORS-open, so the browser fetches it directly: no feed parsing, no worker, no proxy. Stories without an external URL link to their comment thread.
- **GitHub tracker**: recent releases and new repositories for the users and organisations listed in the owners field. Only the newest release per repository is listed. It reads ungh.cc's repository and release endpoints, keeps the last 30 days, caches for ten minutes and reports failures per owner. See [ADR 0002](docs/adrs/0002-github-tracker-uses-ungh.md).

With two column experiments on — Hacker News and GitHub — the sidebar shows one column with a tab per panel. Links you have already opened are dimmed, so unread items stand out.

## Development

Requires [Bun](https://bun.sh/).

```bash
bun install
bun run dev
```

The dev server runs at `http://localhost:5173/tiles/` because the production base path is `/tiles/`.

```bash
bun run check   # svelte-check + TypeScript
bun run test    # Vitest, jsdom and Testing Library
bun run build   # static output in dist/
```

## Deployment

`.github/workflows/ci.yml` runs the type check, the tests and a production build on every pull request and every non-`main` branch. `.github/workflows/deploy.yml` runs the same checks on every push to `main` and then publishes `dist/` to GitHub Pages. Both pin Bun to the version in development, pass the commit SHA as `TILES_BUILD_ID`, and use the Vite `base` `/tiles/`, matching the project page URL.

## Structure

```text
docs/user/                   user guide, compiled into the help dialog at build time
src/
  App.svelte                 board, columns and shared dialogs
  app.css                    tokens, layout and ui-sdk styling
  lib/
    board.ts                 schema validation, URL checks, helpers
    board.svelte.ts          reactive store and localStorage persistence
    sortable.ts              custom reorder primitive
    sortable-parts.ts        generated Svelte parts
    agent.ts                 agent bridge and WebMCP setup
    webmcp.ts                tiles_list and tiles_apply_suggestions tools
    suggestions.ts           preview and apply logic for suggested links
    hn.ts                    Hacker News front page fetch and mapping
    github.ts                ungh repository and release fetch, mapping and ten-minute cache
    experiments/
      ids.ts                 experiment ids, safe for the settings module to import
      registry.ts            descriptors, search order, enabled columns
      calculator.ts          expr-eval based search resolution
      paste.ts               pasted URL list parsing
      route.ts               URL, then experiments, then the search engine
    help.ts                  help topics from docs/user
    prompts/
      suggest-tiles.md       browser history to a grouped URL list
    components/              palette, side panels, groups, tiles, folders, dock, dialogs
  test/setup.ts              jsdom and ui-sdk test setup
```

Components come from [`@ui-sdk`](https://ui-sdk.dev). The local docs are in `node_modules/@ui-sdk/svelte/docs/llms.txt`.

