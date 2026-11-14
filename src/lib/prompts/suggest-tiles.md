# Suggest tiles from browser history

Curate my tiles start page from the history of a browser on this machine.

My constraints, if any:

You only read. I import the result by hand, so the run ends with a grouped URL list and nothing else.

## Rules

- Ask before reading history, and let me pick the browser and the profiles. Never default to the most recently used profile.
- Use bash or PowerShell for the file work. Do not install packages, call a web service, or send history anywhere.
- Read a temporary copy of the `History` database. The live file is locked while the browser runs, and the profile is never written to.
- Rank hosts by visits. That ranking is the selection: take the top 20, then label it. Groups are headings over the ranking, never a budget for sites. Three to six headings is the limit, not the number of sites. A group needs three sites; if a heading needs filler, drop the heading.
- One URL per host. Homepage unless a path is the clear destination.
- A subdomain stands alone: `mise-versions.example.dev` is not covered by `example.dev`.
- Internal is opt-in, at most three, and only where I work daily: my own app, my code server. Admin, status and router pages are out. Dev servers on `localhost:PORT` are out.
- Summarize hosts and visit counts. Do not repeat page titles, full page paths, or URLs with tokens, query strings or credentials in the chat.
- Leave out banking, health, account recovery, adult and file-manager URLs. Mail, drive, calendar, code hosting and AI services are fine.
- Every suggested URL comes from the history table. Do not invent URLs, guess a homepage you did not visit, or promote a path to a domain.
- Do not write to the board. I paste the result into tiles myself.

## Steps

### 1. Find the installed browsers

Check the profile roots for this operating system:

| Browser | Windows | macOS | Linux |
| --- | --- | --- | --- |
| Chrome | `%LOCALAPPDATA%\Google\Chrome\User Data` | `~/Library/Application Support/Google/Chrome` | `~/.config/google-chrome` |
| Edge | `%LOCALAPPDATA%\Microsoft\Edge\User Data` | `~/Library/Application Support/Microsoft Edge` | `~/.config/microsoft-edge` |
| Brave | `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data` | `~/Library/Application Support/BraveSoftware/Brave-Browser` | `~/.config/BraveSoftware/Brave-Browser` |
| Chromium | `%LOCALAPPDATA%\Chromium\User Data` | `~/Library/Application Support/Chromium` | `~/.config/chromium` |
| Vivaldi | `%LOCALAPPDATA%\Vivaldi\User Data` | `~/Library/Application Support/Vivaldi` | `~/.config/vivaldi` |
| Helium | `%LOCALAPPDATA%\imput\Helium\User Data` | — | `~/.config/imput/Helium` |
| Firefox | `%APPDATA%\Mozilla\Firefox\Profiles` | `~/Library/Application Support/Firefox/Profiles` | `~/.mozilla/firefox` |

PowerShell, for the Windows roots:

```powershell
$roots = [ordered]@{
  Chrome   = "$env:LOCALAPPDATA\Google\Chrome\User Data"
  Edge     = "$env:LOCALAPPDATA\Microsoft\Edge\User Data"
  Brave    = "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data"
  Chromium = "$env:LOCALAPPDATA\Chromium\User Data"
  Vivaldi  = "$env:LOCALAPPDATA\Vivaldi\User Data"
  Helium   = "$env:LOCALAPPDATA\imput\Helium\User Data"
}
$roots.GetEnumerator() | Where-Object { Test-Path $_.Value } | ForEach-Object { $_.Key }
Test-Path "$env:APPDATA\Mozilla\Firefox\Profiles"
```

bash, for the Linux roots (use the macOS column on a Mac):

```bash
for root in \
  "$HOME/.config/google-chrome" \
  "$HOME/.config/microsoft-edge" \
  "$HOME/.config/BraveSoftware/Brave-Browser" \
  "$HOME/.config/chromium" \
  "$HOME/.config/vivaldi" \
  "$HOME/.config/imput/Helium"
do
  [ -d "$root" ] && printf '%s\n' "$(basename "$root")"
done
[ -d "$HOME/.mozilla/firefox" ] && echo "Firefox"
```

Add a browser I name that is missing from the table.

Done when: you list the browsers that are actually installed, and I picked one.

### 2. List the profiles

Chromium keeps one folder per profile, each with its own `History` file. Show the folder names, not the full paths. Skip a profile that has no `History` file.

```powershell
$root = "$env:LOCALAPPDATA\Google\Chrome\User Data"
Get-ChildItem $root -Directory |
  Where-Object { Test-Path (Join-Path $_.FullName "History") } |
  ForEach-Object { $_.Name }
```

```bash
root="$HOME/.config/google-chrome"
for history in "$root"/*/History; do
  [ -f "$history" ] && printf '%s\n' "$(basename "$(dirname "$history")")"
done
```

For Firefox, the profile folders hold `places.sqlite` instead. Read `profiles.ini` for the display names when there are many.

Done when: you show the profiles of the chosen browser and I picked one or more of them.

### 3. Copy the database

Copy the file and its journals into a temporary folder, then only read the copy. For several profiles, repeat the next steps per profile and merge the hosts.

```powershell
$tmp = Join-Path $env:TEMP ("tiles-history-" + [guid]::NewGuid())
New-Item -ItemType Directory $tmp | Out-Null
Copy-Item "$root\$profile\History*" $tmp
$db = Join-Path $tmp "History"
```

```bash
tmp=$(mktemp -d)
cp "$root/$profile/History"* "$tmp" 2>/dev/null
db="$tmp/History"
```

For Firefox, copy `places.sqlite*` and set `$db` to that copy instead.

Done when: `$db` points at a copy you created, and the original profile is untouched.

### 4. Read every host

Save this reader as `$tmp/report.cjs`, then run `node "$tmp/report.cjs" "$db"`. A second argument is the window in days; the default is 90. It detects Chromium and Firefox databases, counts every visit in the window, keeps hosts with at least two visits, and prints `hosts<TAB>count` followed by one row per host: host, visits, and the three busiest path prefixes. There is no row limit, so the count line shows how much of the tail you are holding.

```js
const { DatabaseSync } = require("node:sqlite")

const file = process.argv[2]
const days = Number(process.argv[3] ?? 90)
const db = new DatabaseSync(file, { readOnly: true })
const tables = new Set(
  db.prepare("select name from sqlite_master where type = 'table'")
    .all()
    .map((row) => row.name),
)
const firefox = tables.has("moz_places")
const cutoff = firefox
  ? (Date.now() - days * 86400000) * 1000
  : (Date.now() - days * 86400000 + 11644473600000) * 1000
const sql = firefox
  ? `select p.url as url, count(*) as visits
     from moz_places p join moz_historyvisits h on h.place_id = p.id
     where h.visit_date >= ? and (p.url like 'http://%' or p.url like 'https://%')
     group by p.id`
  : `select u.url as url, count(*) as visits
     from urls u join visits v on v.url = u.id
     where v.visit_time >= ? and (u.url like 'http://%' or u.url like 'https://%')
     group by u.id`

const hosts = new Map()
for (const row of db.prepare(sql).all(cutoff)) {
  let url
  try {
    url = new URL(row.url)
  } catch {
    continue
  }
  const host =
    url.hostname.toLowerCase().replace(/^www\./, "") +
    (url.port ? `:${url.port}` : "")
  if (!host) continue
  const entry = hosts.get(host) ?? { visits: 0, paths: new Map() }
  entry.visits += Number(row.visits)
  const parts = url.pathname.split("/").filter(Boolean).slice(0, 2)
  const prefix = parts.length ? `/${parts.join("/")}` : "/"
  entry.paths.set(prefix, (entry.paths.get(prefix) ?? 0) + Number(row.visits))
  hosts.set(host, entry)
}

const ranked = [...hosts]
  .filter(([, entry]) => entry.visits >= 2)
  .sort((left, right) => right[1].visits - left[1].visits)
console.log(`hosts\t${ranked.length}`)
for (const [host, entry] of ranked) {
  const top = [...entry.paths]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([path, visits]) => `${path} ${visits}`)
    .join(", ")
  console.log(`${host}\t${entry.visits}\t${top}`)
}
```

Done when: you hold the ranked host table for the window I asked for, the count line matches the number of rows, and you checked that no row was cut off.

### 5. Read the paths

The path column already holds the three busiest prefixes per host. Use it to choose between a homepage and a deep link: a path wins only when it is clearly the destination, is not a login, search, checkout or settings URL, and carries no token or id.

Done when: every host you may suggest has a homepage-or-path choice you can defend in one line.

### 6. Select

Show the ranked table (host, visits, homepage or path). Do not group yet.

Done when: the table ranks every host with at least two visits, ungrouped, and the rows match the count from step 4.

### 7. Cut with me

Show the top 20 and ask which of these I want and what the headings should be. Add anything I name that is missing from the table — a host I visit rarely is still mine. Ask separately whether internal links belong on the board, and list at most three daily-use ones. Only then group.

A group needs three sites. If a heading needs filler, drop the heading.

Done when: I approved the sites and named the headings, every excluded host has a reason, and any internal sites are at most three and used daily.

### 8. Tell me how to import it

In tiles, turn on **Paste links** under Settings → Advanced → Experimental. Then open the palette with Ctrl/Cmd + K, choose **Add links…**, pick the group, and paste the URLs for that group. Addresses already on the board are skipped, and the dialog shows the count before saving. Repeat per group. One Add links… run is one undo step.

Done when: I have the steps for the list that follows, and nothing was written without me.

### 9. Produce the import list

End with one fenced block of group headings and bare `http`/`https` URLs, nothing after it:

```text
Work
https://github.com
https://linear.app

Reading
https://news.ycombinator.com
```

Rules for the block: no visit counts, no comments, no markdown links, no trailing punctuation. Group headings are for me; I copy the URLs under one heading at a time.

Done when: the block has exactly the hosts I approved, every URL matches a row from the step 4 table, no host appears twice, and the block is the last thing in your reply.

## Reference: reading rules

- The copy is only for this run; delete `$tmp` afterwards.
- When the reader fails because the database is locked or incomplete, ask me to close the browser and copy the profile again.
- Never read `Cookies`, `Login Data`, `Web Data` or any other profile file.
