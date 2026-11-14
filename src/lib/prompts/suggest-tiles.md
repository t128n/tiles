Curate my tiles start page from my local browser history.

My constraints, if any:

## Rules

History is private and the board is mine. Four moves: **survey**, **plan**, **dry run**, **write**. Every step ends at its check.

- Confirm the browser and profile with me before you read history. I pick the profile.
- Keep the summary public-safe: domains and visit counts, no page titles or paths.
- Leave sensitive domains out: banking, health, account recovery, adult, local, intranet. Mail, drive, calendar and AI services are fine.
- Add only. Existing groups, tiles and their order stay as they are.
- Reach the page through the `browse` tool and its `localStorage`.

## Steps

### 1. Pick the origin

Local dev is `http://localhost:5173/tiles/`, production is `https://t128n.github.io/tiles/`. Each origin keeps its own board, and `localhost` and `127.0.0.1` are different origins. Ask when my intent is unclear. For localhost, start `bun run dev` in the background if it is not running, then open the page.

Done when: I named an origin and the page is open.

### 2. Pick the profile

Run `bun run history:profiles`. Show browser and profile names only, never paths. I choose; you do not. If my browser is missing, ask for the path to its `History` file.

Done when: I confirmed one profile, or gave a `History` path.

### 3. Read the summary

```sh
bun scripts/chrome-history.ts --profile "<Browser/profile>" --days 90 --min-visits 5 --limit 60
```

Swap `--profile` for `--history "<path>"` when I gave a path. Add `--include-local` or `--include-titles` only when I ask. The helper reads a temporary copy of the Chromium `History` database; CDP has no history API, so the helper is the only source.

Done when: you hold a domain and visit-count table for the window I asked for.

### 4. Read the board

Open the chosen origin and read the value:

```js
const raw = await page.evaluate(() => localStorage.getItem("tiles:v1"))
return raw
```

`null` means an empty board. Invalid JSON, or a board that is not `version: 1`, ends the run: report it and leave the value untouched. Close other tiles tabs before writing, so an older tab cannot write over the result.

Done when: you hold a valid board, or know it is empty.

### 5. Write the plan

Propose three to six groups in my vocabulary. Keep the strongest sites, prefer homepages, and skip search engines, redirectors, duplicates, and anything private. Reuse an existing group's title instead of creating a second group for the same theme. A frequent mail, drive, calendar or AI service belongs in a Personal group; ask when unsure.

Show a compact plan:

```text
Work
  github.com (143 visits)
  linear.app (67)

Reading
  news.ycombinator.com (98)
```

List skipped duplicates and the sites you left out as private. Ask: "Add these N links in M groups?"

Done when: the plan names its groups and links, every site you considered is placed or listed as skipped, and I can see the skips.

### 6. Get approval

Wait for my yes. A no ends the run.

Done when: I answered yes.

### 7. Dry run

Call the merge function under Reference with `{ plan, dryRun: true }`, which only reads. Report the groups and links it would add, plus duplicates and invalid URLs.

Done when: the dry run matches the plan. When it differs, revise the plan and return to step 6.

### 8. Write and verify

Call the same merge with `{ plan, dryRun: false }`, then reload the page:

```js
const result = await page.evaluate(merge, { plan, dryRun: false })
await page.reload()
```

Report the final group and tile counts. One batch per approval; a second batch needs a new plan and a new approval.

Done when: the reloaded page shows the new groups and the counts match the plan.

## Reference: merge function

`page.evaluate` receives this function as `merge`. It validates URLs, canonicalizes them, skips duplicates across links and folders, matches groups by title, and writes only when `dryRun` is false.

```js
({ plan, dryRun }) => {
  const KEY = "tiles:v1"
  const raw = localStorage.getItem(KEY)
  let board
  if (raw === null) board = { version: 1, groups: [] }
  else {
    try { board = JSON.parse(raw) }
    catch { return { error: "The saved board is not valid JSON. Nothing was written." } }
  }
  if (!board || board.version !== 1 || !Array.isArray(board.groups)) {
    return { error: "The saved board has an unexpected shape. Nothing was written." }
  }

  const canon = (value) => {
    const url = new URL(value)
    url.hash = ""
    if (url.hostname.startsWith("www.")) url.hostname = url.hostname.slice(4)
    return url.href
  }

  const existing = new Set()
  for (const group of board.groups) {
    for (const tile of group.tiles ?? []) {
      if (tile.kind === "link") existing.add(canon(tile.url))
      else for (const link of tile.links ?? []) existing.add(canon(link.url))
    }
  }

  const byTitle = new Map(
    board.groups.map((group) => [group.title.trim().toLowerCase(), group]),
  )
  const addedGroups = []
  const addedLinks = []
  const duplicates = []
  const invalid = []

  for (const suggestion of plan.groups ?? []) {
    const title = String(suggestion.title ?? "").trim().slice(0, 120) || "Suggested"
    const newLinks = []

    for (const link of suggestion.links ?? []) {
      let url
      try {
        const input = String(link.url ?? "")
        const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`
        const parsed = new URL(candidate)
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error()
        url = parsed.href
      } catch {
        invalid.push(String(link.url ?? ""))
        continue
      }

      const key = canon(url)
      if (existing.has(key)) {
        duplicates.push(url)
        continue
      }
      existing.add(key)
      const parsed = new URL(url)
      newLinks.push({
        title:
          String(link.title ?? "").trim().slice(0, 120) ||
          parsed.hostname.replace(/^www\./, "") ||
          "Untitled",
        url,
      })
    }

    if (newLinks.length === 0) continue

    let group = byTitle.get(title.toLowerCase())
    if (!group) {
      group = { id: crypto.randomUUID(), title, tiles: [] }
      byTitle.set(title.toLowerCase(), group)
      board.groups.push(group)
      addedGroups.push(title)
    }

    for (const link of newLinks) {
      group.tiles.push({
        id: crypto.randomUUID(),
        kind: "link",
        title: link.title,
        url: link.url,
      })
      addedLinks.push({ group: group.title, title: link.title, url: link.url })
    }
  }

  if (!dryRun && addedLinks.length > 0) {
    localStorage.setItem(KEY, JSON.stringify(board))
  }

  return {
    dryRun,
    addedGroups,
    addedLinks,
    duplicates,
    invalid,
    groups: board.groups.map((group) => ({
      title: group.title,
      count: group.tiles.length,
    })),
  }
}
```
