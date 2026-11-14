# Experiments: pluggable test features

Status: draft for approval · 2026-11-14

## Intent

The Hacker News column is the only experimental feature in tiles, and it is
wired in three places with one boolean (`experimentalHn`): the settings model,
the settings dialog and `App.svelte`. The person using the app wants more of
that kind of thing — small, self-contained features that come in handy — and
wants each one to be switchable, so an experiment can be turned on to try it and
off without a code change.

The reason behind it: HN is a discovery stream, opened to find new things. The
next experiments are utilities instead — things that make the search field and
the add flow do more work, rather than another place to read.

This design adds four experiments (a calculator in the search field, pasting
several links at once into a group, a GitHub release and repository tracker, and
tabbed sidebars that let the two column experiments coexist), moves all
experiments onto one registry, and migrates the HN flag onto it. Bangs
(`!gh query`, sourced from `kagisearch/bangs`) were evaluated and dropped by the
person using the app; that decision is recorded under "Approaches" so it is not
quietly reopened.

## What an experiment is

A module in `src/lib/experiments/` that:

- declares its id, title, one-line description and settings-search terms;
- may implement one capability the app already knows how to host;
- owns all of its logic, including its tests;
- is off until the person turns it on.

The app has exactly three host points today:

1. **Search resolution** — given what is typed into the search dialog, return
   "navigate here" or "copy this value", or nothing.
2. **The palette / dialog slot** — a command in the command palette that opens a
   dialog the app knows how to render.
3. **The sidebar** — a column next to the tiles. A descriptor may declare
   `column: true`; one enabled column renders as-is, two or more share the
   column through tabs.

The HN column is a column, not a capability: it is flagged by the registry and
rendered by the sidebar host. A second *kind* of capability needs a call site; a
new experiment that uses an existing capability needs its module and one
registry line. There is no runtime plugin loading, no `import()` of third-party
code, and no lifecycle system.

## Goals

- One registry drives the Experimental settings pane; no per-feature rows in
  the dialog.
- Adding a search-field experiment touches no component.
- A calculator that evaluates ordinary arithmetic and copies the result.
- A bulk add flow that turns a pasted block of URLs into tiles in one group, in
  one commit, undoable.
- The existing HN toggle keeps working for anyone who had it on.
- A GitHub column that lists recent releases and new repositories for the owners
  the person configures, within the unauthenticated API budget.
- HN and GitHub can both be enabled and share the sidebar through tabs.
- The search field lives in the command palette, which never sits on top of the
  HN column's heading.

## Non-goals

- Bangs, feed parsing, proxies, workers, or any list of user feeds.
- Network lookups for page titles (titles come from the hostname).
- Runtime-installed plugins, remote manifests, a plugin marketplace, or loading
  third-party code at all.
- A component runtime with activation, disposal or dependency tracking.
- A second column beside the sidebar. The column experiments share one slot
  through tabs; two panels side by side is a separate decision.
- Editing individual titles in the bulk add flow (rename afterwards on the tile).
- GitHub authentication, notifications, webhooks, background polling or a push
  service. The tracker reads public events on demand.
- Following repositories individually; owners (users or organisations) are the
  unit.

## Anti-goals

- An experiment that writes to `tiles:v1` without an undo snapshot.
- An experiment that cannot be turned off without clearing storage.
- A generic plugin host with lifecycle hooks in a four-feature app.
- A feature that only works online when it could work offline.

## Constraints

- `localStorage` key `tiles:v1` is untouched by this work; settings stay under
  `tiles:settings:v1`.
- URLs are http or https only, validated by `normalizeUrl`.
- One-line description per settings row; the two-pane settings dialog keeps its
  shape.
- The app ships nearly no dependencies (lucide, ui-sdk). A new runtime dependency
  has to earn its weight.
- Destructive actions confirm and carry `data-agent-confirm`; additive actions
  rely on the ten-second undo snapshot instead.
- The GitHub tracker reads ungh.cc, a cached CORS-open proxy: one repository list
  per owner plus the releases of the eight most recently pushed repositories,
  keeping the last 30 days. The ten-minute cache and the ten-owner cap bound the
  request count; see [ADR 0002](../adrs/0002-github-tracker-uses-ungh.md).

## Approaches

**Bangs — dropped.** Kagi's `data/bangs.json` is 10,911 bangs, 2.24 MB raw
(≈250 KB gzipped after projection to trigger + template). The three delivery
options were a lazily loaded full catalog, a generated subset inlined into the
bundle, and a runtime fetch. All three add a delivery mechanism, a regeneration
script and a staleness story for a feature the person using the app then decided
they do not want. Nothing is built. If it returns later, the lazily loaded
projected catalog is the shape to start from.

**Calculator — a library.** Chosen: `expr-eval` (MIT, zero dependencies, 25 KB
minified / 7.5 KB gzipped, last published 2020). Rejected: a ~120-line in-repo
tokenizer and shunting-yard (owning precedence and number-format edge cases for
no size win worth the risk), and no calculator at all.

**Modularity — modules with capabilities.** Chosen: one registry of module
descriptors, each optionally implementing a known capability. Rejected: one
boolean per feature (the status quo, which stops being modular after two
features), and a component runtime with revertible effects, coeffect-gated
activation, disposal and ordering. The runtime is the right shape for a plugin
ecosystem; four features in a 1,500-line app do not have the problem it solves,
and every mechanism would need its own tests to justify itself.

## Design

### Settings model and migration

`src/lib/settings.svelte.ts`:

```ts
export const EXPERIMENT_IDS = ["hn", "calculator", "paste-links", "github"] as const
export type ExperimentId = (typeof EXPERIMENT_IDS)[number]

export interface Settings {
  searchEngine: SearchEngine
  theme: Theme
  openLinksInNewTab: boolean
  experiments: Partial<Record<ExperimentId, boolean>>
  /** GitHub users or organisations the tracker follows. */
  githubOwners: string[]
}
```

- `DEFAULT_SETTINGS.experiments` is `{}`; absent means off.
- `DEFAULT_SETTINGS.githubOwners` is `["vercel-labs", "anomalyco"]`, the owners
  the person named when asking for the feature.
- `read()` keeps only booleans for ids in `EXPERIMENT_IDS`, drops everything else
  in the object.
- `readOwners()` keeps at most ten entries that match
  `^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$`, de-duplicated case-insensitively.
  Anything else is dropped rather than repaired.
- Migration, in order: when `experiments.hn` is absent, a boolean
  `experimentalHn` wins; otherwise `experimentalRss === true` sets it (the
  existing RSS → HN migration, folded into the same step). Both old keys are then
  discarded.
- `experimentEnabled(settings, id): boolean` is the only reader used by features.

Unreadable settings still fall back to defaults, as today. A settings object
without `experiments` is valid and reads as all-off.

### Registry

`src/lib/experiments/registry.ts` — pure TypeScript, no Svelte components:

```ts
export type SearchResolution =
  | { kind: "navigate"; hint: string; href: string }
  | { kind: "copy"; hint: string; value: string }

export interface SearchContext {
  settings: Settings
}

export interface ExperimentDefinition {
  id: ExperimentId
  title: string
  description: string
  /** Extra words the settings search should match. */
  terms: string[]
  /** The experiment renders in the sidebar. */
  column?: boolean
  resolveSearch?: (query: string, context: SearchContext) => SearchResolution | null
}

export const EXPERIMENTS: ExperimentDefinition[] = [hn, calculator, pasteLinks, github]
```

`calculator` is the only search experiment; `paste-links` is a palette/dialog
experiment; `hn` and `github` declare `column: true`. `EXPERIMENTS` order is the
order search experiments are tried and the order sidebar tabs appear.

`ExperimentId` lives in `src/lib/experiments/ids.ts` with no imports, so
settings can depend on it while registry modules import `Settings` as a type
without a cycle.

### Search routing

`src/lib/url.ts` exports the URL test that currently lives inside
`searchTarget`, and tightens it:

```ts
export function looksLikeUrl(value: string): boolean
```

Today it is `schemePattern.test(q) || /^[^\s/]+\.[^\s/]{2,}(\/.*)?$/`, which
treats any token containing a dot as a URL. That breaks the calculator before it
is written: `1.5*2` matches, `normalizeUrl` accepts it, and Enter navigates to
`https://1.5*2/` (verified against the current code). `2.55` resolves to
`https://2.0.0.55/` because the WHATWG parser reads it as an IPv4 shorthand.

The replacement matches a scheme, a dotted host whose last label is alphabetic
(`example.com`, `sub.example.co.uk`, with optional port, path, query, hash), or
an IPv4 address. Localhost without a dot stays a search, as it is today.

`src/lib/experiments/route.ts`:

```ts
export type QueryResolution =
  | { kind: "navigate"; href: string; hint: string | null }
  | { kind: "copy"; value: string; hint: string }

export function resolveQuery(query: string, settings: Settings): QueryResolution | null
```

Order: empty → `null`; `looksLikeUrl` → navigate via `searchTarget`; then each
enabled experiment with `resolveSearch`, first non-null wins; then navigate via
`searchTarget` (the configured engine). URL detection stays ahead of every
experiment so a typed address can never be swallowed by the calculator.

`PaletteDialog.svelte` calls `resolveQuery` on every keystroke and renders the
result as the palette's first action: `Copy 54` for a calculator result,
`Open …` for an address, `Search <engine> for “…”` otherwise. Choosing it
navigates, or copies the value to the clipboard. If the clipboard write rejects,
nothing is lost; the value is still in the action's label.

### Search lives in the palette

**The bug this replaced.** The old `.search-overlay` was
`position: fixed; top: 18px; z-index: 40` with no backdrop, so the field sat on
top of the HN heading with nothing separating it from the page underneath.

**The design.** The separate overlay is gone. The command palette is the single
search surface: ui-sdk `Dialog` + `DialogBackdrop` + `DialogContent`, opened by
typing outside a field, `/`, `Ctrl/Cmd+F`, or the dock button, and closed with
Escape or a selection. Search results are the palette's own list — the resolved
web/calculator action first, then matching tiles, then commands — rather than a
live filter of the board behind it. The board stays untouched while you type.

The window-level key listener keeps its `popupOpen` guard, so typing inside
another dialog never opens the palette, and a command that opens another dialog
runs only after the palette has closed so two dialogs never overlap.

### Calculator

`src/lib/experiments/calculator.ts`, using `Parser` from `expr-eval` with no
variables defined.

It returns a resolution only when all of these hold:

- trimmed query is 1–120 characters;
- `looksLikeUrl` is false;
- the query contains an operator (`+ - * / % ^ ( )`) or a known function name —
  a bare number is not an expression worth showing;
- it does not end with an operator;
- evaluation returns a finite number.

Any parse or evaluation error, including "undefined variable", returns `null`, so
ordinary search words are never hijacked.

Formatting: integers below 1e15 print as-is; otherwise `toPrecision(12)` with
trailing zeros and a trailing decimal point stripped; magnitudes ≥ 1e15 or
< 1e-6 use `toExponential(6)`. `1/3` shows `0.333333333333`.

Hint: `= 54 · Enter to copy`.

### Paste links

`src/lib/experiments/paste.ts` (pure):

```ts
export interface ParsedPaste {
  links: { title: string; url: string }[]
  duplicates: number
  invalid: number
  overflow: number
}

export function parseUrlList(text: string, existing: Set<string>): ParsedPaste
```

- Split on whitespace and newlines, cap at 50 candidates; anything beyond counts
  as `overflow`.
- A candidate counts as a link only if it has a scheme or looks like a host
  (`looksLikeUrl`); `normalizeUrl` then decides validity.
- Dedupe within the paste and against `collectUrls(board)` using the existing
  canonical form in `src/lib/suggestions.ts` (export `canonical` from there
  rather than duplicating it).
- Titles come from `titleFromUrl`.

`BoardStore.addLinks(groupId, links: NewLink[]): number` — validates the group and
every URL first, builds all `LinkTile`s, commits **once** with
`rememberUndo("Added N links")`, and returns how many were added. It never
commits partially, and never leaves an undo entry when nothing was added.

`BulkAddDialog.svelte`: ui-sdk `Field`, `Select` (group, defaulting to the group
that opened it) and `Textarea` (the seed text), a live summary line (`4 links · 1
duplicate · 1 invalid`), and one primary button, disabled at zero links or with
no group. The dialog does not ask for confirmation; the undo toast is the safety
net.

Entry points, both only when the experiment is enabled:

- Command palette → **Add links…**, opening the dialog empty. The group select
  defaults to the first existing group. On a board with no groups the button stays
  disabled and the dialog asks for a group instead of creating one: opening the
  flow must not write to the board.
- Pasting two or more URL-like tokens into the URL field of Add link. `TileForm`
  hands the text to `openBulkAdd` and closes the tile dialog; `App.svelte` queues
  the bulk dialog until the tile dialog's close animation finishes, so two dialogs
  never overlap. The seed and the current group are preserved. A single-token
  paste keeps today's behavior. This interception only happens when the form is
  adding a group tile (`payload.folderId` unset); inside a folder's Add link dialog
  the paste is left alone, because the bulk flow writes to groups only.

`AppActions` gains `openBulkAdd(seed?: string, groupId?: string)`. `App.svelte`
owns the dialog controller and renders `BulkAddDialog` behind the flag;
`PaletteDialog.svelte` renders the palette item behind the flag.

The flow is unavailable when `store.loadError` is set, like every other write.

### GitHub tracker

`src/lib/github.ts` holds the parsing and the fetch:

```ts
export interface GithubItem {
  id: string
  kind: "release" | "repository"
  owner: string
  repo: string
  title: string
  url: string
  createdAt: string
}

export interface GithubFeed {
  items: GithubItem[]
  errors: { owner: string; message: string }[]
}

export function parseRepos(payload: unknown): RepoRef[]
export function repoItems(repos: RepoRef[], now: number): GithubItem[]
export function parseReleases(repo: string, payload: unknown, now: number): GithubItem[]
export async function fetchOwner(owner: string, options): Promise<GithubFeed>
export async function fetchOwners(owners: string[], options): Promise<GithubFeed>
export async function loadFeed(owners: string[], options): Promise<GithubFeed>
```

- Source: `https://ungh.cc` — `GET /orgs/{owner}/repos`, falling back to
  `GET /users/{owner}/repos` on 404, then `GET /repos/{owner}/{repo}/releases`
  for the eight most recently pushed repositories of that owner. Both endpoints
  are CORS-open (verified).
- Repositories created within 30 days become `repository` items from `createdAt`;
  releases published within 30 days become `release` items, titled by name or tag,
  linking to `https://github.com/{repo}/releases/tag/{tag}`.
- Items are merged, sorted newest first and capped at 40.
- `loadFeed` serves `localStorage["tiles:github:v1"]`
  (`{ fetchedAt, owners, items, errors }`) while it is younger than ten minutes,
  the owner set matches and the entries validate (http/https URLs, unique ids,
  `fetchedAt` not in the future). A corrupt or foreign cache is ignored.
  `refreshFeed` bypasses the cache and is what the refresh button calls.
- A failed owner is reported as one line and never hides the other owners' items.
  When a refresh returns nothing but errors, the cache's items are kept and the
  errors stored with them, so a typo'd owner neither empties the panel nor causes
  a request on every load.

**Why ungh.cc.** The events feed (`/users/{owner}/events/public`) was the first
source, but it only carries the last 30 public events and GitHub omits most
release and creation events from it: `vercel-labs` showed six `MemberEvent`s and
nothing else, so the panel was empty. ungh exposes repositories and releases
directly, cached and without a rate limit. The cost is 1 + 8 requests per owner
per refresh instead of one, bounded by the ten-minute cache. The 30-day window
and the eight-repository release scan are documented limits: a release from a
repository that has not been pushed recently is not shown. See
[ADR 0002](../adrs/0002-github-tracker-uses-ungh.md).

`GithubPanel.svelte` mirrors the HN column: heading, count, `Beta` badge, refresh
button, and a list of links. Only the newest release of each repository is shown
(`latestPerRepo`), so an afternoon of patch releases is one entry instead of a
screenful; new repositories stay standalone. Each entry shows its title and
`owner/repo · release|new repository · <relative time>`. Relative time uses
`Intl.RelativeTimeFormat`; nothing is recomputed on a timer. With no owners
configured, the panel points at Settings → Experimental instead of fetching.

Both panels rely on the browser's `:visited` for read state: an opened row takes a
`--surface-2` background and its title drops to the dim `--read` colour. No app
state is involved, and no list is written.

### Tabbed sidebars

`SidePanels.svelte` is the sidebar host. It maps column ids to components
(`hn → HnPanel`, `github → GithubPanel`) and renders:

- nothing when no column experiment is enabled;
- the single panel when one is;
- ui-sdk `Tabs` when two or more are, with one tab per enabled column in
  registry order, the first selected. Panels stay mounted per tab, so switching
  back does not refetch; each panel keeps its own cache and refresh state.

The tab bar is not an experiment: it appears exactly when a second column is
enabled, because the alternative is two stacked columns fighting for one slot.
`App.svelte` renders `<SidePanels />` and adds `with-panel` to the workspace when
`columnExperiments` is non-empty. `.workspace.with-hn` is renamed
`.workspace.with-panel`, since the column is no longer only HN.

### Settings → Advanced → Experimental

The Experimental pane stays where it is, in the sidebar's **Advanced** group
below Settings → Appearance, and becomes the single place every experiment is
registered. No dialog code mentions an experiment by name, with one deliberate
exception: the GitHub owners field, which is configuration rather than a flag.

- The pane maps over `EXPERIMENTS` in registry order and renders one
  `settings-row` per definition: label, one-line description, and a `Switch`
  labelled with the experiment's title. Same row shape and spacing as the HN row
  today.
- Each definition's `terms` are merged into the section's own `terms`, so the
  settings search finds an experiment by its name, its description or its extra
  words. The existing "No settings match" state covers a miss.
- The section is visible whenever `EXPERIMENTS` is non-empty; removing the last
  experiment removes the pane rather than leaving an empty card.
- Flipping a switch writes
  `settings.update({ experiments: { ...value.experiments, [id]: checked } })`.
  Nothing else in the dialog changes when an experiment is added or removed.
- When the GitHub experiment is on, an owners row follows the switches: label
  “GitHub owners”, a one-line description, and a text field holding the owners
  comma-separated. On change the field parses, validates and writes
  `githubOwners`; invalid entries are dropped, so the field may briefly show more
  than the stored list. It is the only experiment-specific row, because owners are
  configuration rather than a flag.

### HN on the registry

- `App.svelte` no longer knows about HN: `SidePanels.svelte` reads the column
  experiments and renders the panel. `.workspace.with-hn` becomes
  `.workspace.with-panel`.
- The HN definition carries today's description: the front page column next to
  the tiles, read from the public Algolia HN API.

### Failure modes and how they are handled

| Case | Behavior |
| --- | --- |
| `expr-eval` throws (bad syntax, unknown name) | Calculator returns `null`; the query goes to the search engine. |
| Clipboard write rejected | Hint still shows the value; no error dialog. |
| Bulk paste with duplicates only | Button stays disabled; the summary says `0 links`. |
| Bulk add on a read-only/blocked store | `loadError` disables the flow, as elsewhere; quota errors keep the existing warning. |
| Bulk add resolves to 0 links | `addLinks` writes nothing and leaves no undo entry. |
| Saved settings contain unknown experiment ids | Dropped on read; no write until the next settings change. |
| Saved settings contain `experimentalHn: true` | HN is on after migration. |
| Expression like `2026` or `911` | No operator, so no calculator hint; normal search. |
| A decimal expression like `1.5*2` | The tightened URL test no longer matches it; the calculator handles it. |
| Search dialog open and a tile clicked | The palette is modal; choosing a tile or a command closes it before the result runs. |
| A repository or release request fails | Repository items still render; release failures are silent, repository failures are one line per owner. |
| ungh returns an error for one owner | The other owners' items still render; the failure is one line in the panel. |
| No owners configured | The panel points at Settings → Experimental and makes no request. |
| Corrupt or foreign GitHub cache | Ignored and replaced on the next fetch. |
| Two column experiments enabled | One tab each; the first column is selected; panels stay mounted, so switching does not refetch. |

## Tests

- `settings.test.ts`: defaults have `experiments: {}`; known booleans survive;
  unknown ids and non-booleans drop; `experimentalHn: true` and
  `experimentalRss: true` both migrate to `experiments.hn`; `update()` merges.
- `registry.test.ts`: ids unique, every id in `EXPERIMENT_IDS`, every definition
  has a title, a one-line description and terms, and `calculator` precedes
  `paste-links`.
- `calculator.test.ts`: precedence, associativity, parentheses, unary minus, `%`,
  `^`, `sqrt`/`log`, `1/3`, `1/0`, `1e20`, `0.0000001`, bare `2026`, `911`,
  trailing `2+`, `hello`, empty, `2 + 2` with spaces.
- `route.test.ts`: URL wins over an experiment; enabled calculator wins over the
  engine; disabled experiment is skipped; unknown query falls through to the
  configured engine.
- `url.test.ts`: `1.5*2` and `2.55` are no longer URL-shaped; `example.com`,
  `sub.example.co.uk/path?q=1`, `example.com:8080`, `https://example.com` and
  `192.168.1.10` still are.
- `paste.test.ts`: mixed whitespace and newlines, bare hosts, duplicates inside
  the paste and against the board, invalid tokens, the 50 cap, title fallback.
- `board.test.ts`: `addLinks` commits once, keeps one undo entry, rejects an
  unknown group and returns 0 without writing or leaving an undo entry.
- `github.test.ts`: a repository list maps `createdAt`/`pushedAt` and keeps only
  the last 30 days; releases keep recent tags with name fallback and the tag URL;
  the org endpoint falls back to the user endpoint; only the eight most recently
  pushed repositories are asked for releases; a failed release request keeps the
  repository items; the feed merges, sorts and caps at 40; the cache serves fresh
  items and errors, ignores a foreign owner set and a poisoned entry, caches empty
  results, skips aborted fetches and keeps stale items when a refresh fails.
- `App.test.ts`: the Experimental pane lists every registry entry and toggling
  one persists `experiments.<id>`; the palette shows **Add links…** only when
  enabled; typing a letter opens the palette with that character; `18*3` offers
  `Copy 54` and copies it; pasting three URLs adds three tiles with one undo
  entry; the GitHub owners field persists parsed owners; with HN and
  GitHub enabled the sidebar renders two tabs and switching shows the other panel.

## What is left to the builder

- Exact summary copy (keep it terse and one line).
- Icon choices from lucide for the palette item and dialog.
- Whether `BulkAddDialog` remembers the last group between openings (start
  without memory).
- Ordering of the search experiments in `EXPERIMENTS` (calculator first).

## Documentation to update with the change

- `docs/user/`: `getting-started.md` and `keyboard.md` get the calculator hint
  and the paste flow; `browser-setup.md` is untouched.
- `README.md`: replace the HN-only framing under Settings with a short
  experiments list, including the GitHub tracker and tabbed sidebars.
- `AGENTS.md`: the registry contract, `experiments` in settings, one commit per
  bulk add, the palette as the only search surface, the GitHub cache and request
  budget, the sidebar host, and the ban on runtime plugin loading.
- `AGENTS.md` structure block: `src/lib/experiments/`, `github.ts`,
  `SidePanels.svelte`.

This repo is not a git checkout, so this document is written to disk but not
committed.
