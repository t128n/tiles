# tiles

A local-first start page built with Svelte 5, Vite and ui-sdk.

## Before changing UI

Read `node_modules/@ui-sdk/svelte/docs/llms.txt` and the page for each component you use. For a custom behavior, read `docs/core.md` by heading and `docs/rendering.md` next to it. Follow the installed `ui-sdk` skill if it is available.

- Import each component from its own entry: `@ui-sdk/svelte/dialog`, not a root import.
- Use `Field`, `Input`, `Select`, `Button`, `Menu` and `Dialog` parts instead of bare controls where an agent should see them.
- Keep every control named, and put `data-agent-confirm` on destructive confirm buttons.
- Do not hand-roll popup, focus, menu or drag behavior that ui-sdk ships.

## Commands

```bash
bun run dev    # http://localhost:5173/tiles/
bun run check
bun run test
bun run build
```

## Invariants

- `localStorage` key is `tiles:v1`. Do not overwrite unreadable saved data.
- URLs are http or https only.
- The old `tiles_app_data` key is deliberately not imported.
- The folder hierarchy is one level deep.
- The dashboard has no header. Groups span the full width on a 72-column grid; the `tiles` wordmark is a fixed bottom-right watermark.
- Add link lives in the invisible ghost cell at the end of each group (`Add link to <group>`) and in the command palette. Do not reintroduce a header Add button.
- One palette holds search and commands: typing outside a field, `/`, Ctrl/Cmd+F and Ctrl/Cmd+K open it. It lists matching tiles, a web search for the query and commands, and never filters the board behind it.
- Site icons try `/apple-touch-icon.png`, `/favicon.ico`, `/assets/favicon.ico`, then a letter tile. No favicon resolver or third-party icon service.
- The experimental column is the Hacker News front page, read directly from the CORS-open Algolia API (`https://hn.algolia.com/api/v1/search?tags=front_page`). Do not reintroduce feed parsing, a feed worker, a proxy or a list of user feeds.
- Experiments are modules in `src/lib/experiments/`: `ids.ts` holds the ids, `registry.ts` the descriptors (title, one-line description, `terms`, optional `column`, optional `resolveSearch`). The Experimental pane is rendered from `EXPERIMENTS`; adding an experiment touches its module, the registry and, at most, one host call site. No runtime plugin loading.
- `Settings.experiments` maps ids to booleans and `Settings.githubOwners` holds the tracker's owners. `experimentEnabled()` is the only flag reader; the old `experimentalHn` and `experimentalRss` keys migrate into `experiments.hn`.
- Column experiments set `column: true`. `SidePanels.svelte` renders one panel, or ui-sdk tabs when two or more are enabled; the tab bar is not a switch of its own.
- Feed links use the browser's `:visited` for their read state: the row takes a `--surface-2` background and the title drops to the dim `--read` colour. `:visited` cannot animate or dim through opacity, so the difference is colour, not weight.
- Bulk paste and the calculator write nothing outside `BoardStore.addLinks`; that method commits once and keeps one undo snapshot for the whole batch.
- The GitHub tracker reads ungh.cc: one repository list per owner plus releases
  for the eight most recently pushed repositories, 30-day window, ten-minute
  cache under `tiles:github:v1`, owners capped at ten. Only the newest release of
  each repository is listed (`latestPerRepo`). See
  `docs/adrs/0002-github-tracker-uses-ungh.md`. Do not go back to the public
  events feed; it is too sparse to fill the panel.
- The settings dialog is a two-pane modal (search, sidebar sections, card rows). Keep new settings as rows with a label and a one-line description. Settings and help share the `.panel-*` layout classes; settings-only parts stay in `.settings-*`.
- User documentation is `docs/user/*.md`, imported with `?help`. The `tiles-user-docs` Vite plugin compiles it to HTML at build time with satteri, so no Markdown parser or raw Markdown ships to the browser. Help is the only home for browser setup instructions; the README links to it.
- Help opens with Ctrl/Cmd + ? (`mod+?` and `mod+shift+?`) and with Alt + ? (`alt+?` and `alt+shift+?`), from the dock menu and from the command palette.
- With two or more column experiments on, the sidebar remembers the tab in `Settings.sidebarTab` and reopens it after a reload. A tab that is no longer enabled falls back to the first.
- Deletes, reset and import keep one undo snapshot for ten seconds (`rememberUndo`, `clearUndo`, `undo`). Import validates with `parseBoard`, previews the counts, and replaces only after confirmation in Settings → Data; it stays undoable. The command palette offers **Export board** and **Import board** (the latter opens Settings → Data).
- Dialogs use a light backdrop without blur.
- Settings → About offers **Update now** for a new service worker or a newer `version.json`. The click marks the current build in `sessionStorage`, reloads, and the next page opens Settings → About with a green confirmation from `consumeUpdateRequest`. Do not go back to a bare "Reload" button.

## WebMCP and prompts

- `src/lib/webmcp.ts` registers `tiles_list` and `tiles_apply_suggestions` when `document.modelContext` exists. `src/lib/agent.ts` also registers ui-sdk's `snapshot`, `act` and `query`. This is optional browser support; the OpenCode history workflow does not depend on it.
- `tiles_apply_suggestions` defaults to a dry run. Keep the `dryRun: false` path behind `window.confirm`, and never make it delete or reorder.
- `src/lib/prompts/suggest-tiles.md` is the single source for the agent prompt. Only Help → Agent prompts shows and copies it; Settings has no prompts section. There are no `.opencode` command files; do not add them back.
- The prompt reads history with bash or PowerShell, `sqlite3` and the Python standard library. It asks for the browser and the profiles, copies the SQLite database to a temporary folder, and ends with a grouped URL list for **Add links…**. Do not reintroduce the removed `scripts/chrome-history.ts`, and do not let the prompt write to the board.
- Never default to the most recently used browser profile in the prompt. Find the installed browsers, ask, then list profiles and ask again.
- The prompt reports hosts and visits, never page titles or full paths, and leaves sensitive domains out while keeping personal and internal links.


## Structure

- `src/lib/experiments/` - ids, registry, search routing, calculator and paste parsing.
- `src/lib/github.ts` - ungh repository and release fetch, mapping and the ten-minute cache.
- `src/lib/components/SidePanels.svelte` - sidebar host and tabs; `GithubPanel.svelte` and `HnPanel.svelte` are the panels.
- `src/lib/components/PaletteDialog.svelte` - the single search and command palette.
- `src/lib/components/BulkAddDialog.svelte` and `BulkAddForm.svelte` - bulk paste.
- `docs/specs/`, `docs/plans/`, `docs/adrs/`, `docs/user/`.
