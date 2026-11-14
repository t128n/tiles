# Suggest tiles from browser history

Curate my tiles start page from the history of a browser on this machine.

My constraints, if any:

You only read. I import the result by hand, so the run ends with a grouped URL list and nothing else.

## Rules

- Ask before reading history, and let me pick the browser and the profiles. Never default to the most recently used profile.
- Use local tools only: bash or PowerShell, `sqlite3` when it is installed, and the Python standard library as the fallback. Do not install packages, call a web service, or send history anywhere.
- Read a temporary copy of the `History` database. The live file is locked while the browser runs, and the profile is never written to.
- Summarize hosts and visit counts. Do not repeat page titles, full page paths, or URLs with tokens, query strings or credentials in the chat.
- Leave out banking, health, account recovery, adult and file-manager URLs. Mail, drive, calendar, code hosting and AI services are fine.
- Personal and internal links are wanted: intranet names, `*.lan`, `*.local`, `localhost`, self-hosted services and unusual ports. Put them in their own group and keep credentials out of the URLs.
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

### 4. Read the hosts

The window is the last 90 days and at least five visits; change it when I ask. Chromium stores visit times in microseconds since 1601, so the cutoff adds the offset.

```sh
sqlite3 "$db" "
WITH recent AS (
  SELECT u.url AS url, COUNT(*) AS visits
  FROM urls u
  JOIN visits v ON v.url = u.id
  WHERE v.visit_time >= (strftime('%s','now','-90 days') + 11644473600) * 1000000
    AND (u.url LIKE 'http://%' OR u.url LIKE 'https://%')
  GROUP BY u.id
),
hosted AS (
  SELECT
    CASE
      WHEN instr(substr(url, instr(url, '://') + 3), '/') > 0
        THEN substr(url, instr(url, '://') + 3,
                    instr(substr(url, instr(url, '://') + 3), '/') - 1)
      ELSE substr(url, instr(url, '://') + 3)
    END AS host,
    visits
  FROM recent
)
SELECT
  CASE WHEN host LIKE 'www.%' THEN substr(host, 5) ELSE host END AS host,
  SUM(visits) AS visits,
  COUNT(*) AS urls
FROM hosted
GROUP BY 1
HAVING SUM(visits) >= 5
ORDER BY visits DESC
LIMIT 120;"
```

Firefox stores seconds in `moz_historyvisits.visit_date`, so drop the offset:

```sh
sqlite3 "$db" "
SELECT p.url, p.visit_count
FROM moz_places p
JOIN moz_historyvisits h ON h.place_id = p.id
WHERE h.visit_date >= strftime('%s','now','-90 days') * 1000000
  AND (p.url LIKE 'http://%' OR p.url LIKE 'https://%')
ORDER BY p.visit_count DESC
LIMIT 200;"
```

When `sqlite3` is missing, run this with `python` or `python3` and the same copied Chromium file. It prints `host`, visits and the three busiest paths per host, separated by tabs:

```python
import collections, sqlite3, sys, time, urllib.parse

db = sys.argv[1]
days = int(sys.argv[2]) if len(sys.argv) > 2 else 90
cutoff = (int(time.time() * 1000) - days * 86400000 + 11644473600000) * 1000
con = sqlite3.connect("file:" + db + "?mode=ro", uri=True)
rows = con.execute(
    "SELECT u.url, COUNT(*) FROM urls u JOIN visits v ON v.url = u.id "
    "WHERE v.visit_time >= ? AND (u.url LIKE 'http://%' OR u.url LIKE 'https://%') "
    "GROUP BY u.id",
    (cutoff,),
)
hosts = collections.Counter()
paths = collections.defaultdict(collections.Counter)
for url, visits in rows:
    parts = urllib.parse.urlsplit(url)
    if parts.scheme not in ("http", "https"):
        continue
    host = (parts.hostname or "").lower()
    host = host[4:] if host.startswith("www.") else host
    if not host:
        continue
    hosts[host] += visits
    paths[host][parts.path or "/"] += visits
for host, visits in hosts.most_common(120):
    top = ", ".join(path + " " + str(count) for path, count in paths[host].most_common(3))
    print(host + "\t" + str(visits) + "\t" + top)
```

On PowerShell, build the script as `@' … '@ | python - "$db"`. On bash, write it to `$tmp/report.py` and run `python3 "$tmp/report.py" "$db"`.

When neither reader exists, Node 23.4 or newer has SQLite built in as `node:sqlite`; the same SQL runs there without an install. If no reader is available, stop and ask me instead of installing anything.

Done when: you hold a host table with visit counts for the window I asked for.

### 5. Look at subdomains and paths

Separate subdomains stay separate: `mail.example.com` and `example.com` are two rows. Treat a subdomain as the suggestion when I clearly use it more than its root.

For the ten busiest hosts, read the busiest paths so you can choose between a homepage and a deep link. Strip query strings and fragments first; never show tokens or ids.

```sh
sqlite3 "$db" "
WITH recent AS (
  SELECT u.url AS url, COUNT(*) AS visits
  FROM urls u
  JOIN visits v ON v.url = u.id
  WHERE v.visit_time >= (strftime('%s','now','-90 days') + 11644473600) * 1000000
    AND (u.url LIKE 'http://%' OR u.url LIKE 'https://%')
  GROUP BY u.id
),
clean AS (
  SELECT
    CASE
      WHEN instr(url, '?') > 0 THEN substr(url, 1, instr(url, '?') - 1)
      ELSE url
    END AS url,
    visits
  FROM recent
)
SELECT url, SUM(visits) AS visits
FROM clean
WHERE url LIKE 'https://github.com/%' OR url LIKE 'https://linear.app/%'
GROUP BY url
ORDER BY visits DESC
LIMIT 40;"
```

Replace the two `LIKE` patterns with `https://HOST/%` for the hosts you are looking at. The result is for your planning only: in the chat, name the path prefix, never the full address.

Done when: for each host you may suggest, you know whether the homepage or a path is the better tile, and internal hosts are recognized.

### 6. Plan the groups

Propose three to six groups in my vocabulary. Keep the strongest sites, one URL per host, and prefer the homepage unless a path is clearly the destination. Reuse a name I already use when I say it. Put intranet, self-hosted and `localhost` links in one Personal or Internal group. Skip search engines, redirectors, login pages, duplicates and anything private.

Show a compact table before the list:

```text
Work
  github.com        143 visits   homepage
  linear.app         67 visits   homepage

Reading
  news.ycombinator.com   98 visits   homepage
  docs.python.org        31 visits   /3/library

Internal
  nas.lan                22 visits   homepage
  localhost:8080         18 visits   /
```

List the sites you left out as sensitive, and the ones you dropped as duplicates or weak.

Done when: every host in the table is placed in a group or listed as skipped, and I can see the reason.

### 7. Tell me how to import it

In tiles, turn on **Paste links** under Settings → Advanced → Experimental. Then open the palette with Ctrl/Cmd + K, choose **Add links…**, pick the group, and paste the URLs for that group. Addresses already on the board are skipped, and the dialog shows the count before saving. Repeat per group. One Add links… run is one undo step.

Done when: I have the steps for the list that follows, and nothing was written without me.

### 8. Produce the import list

End with one fenced block of group headings and bare `http`/`https` URLs, nothing after it:

```text
Work
https://github.com
https://linear.app

Reading
https://news.ycombinator.com

Internal
http://nas.lan:5000
```

Rules for the block: no visit counts, no comments, no markdown links, no trailing punctuation. Group headings are for me; I copy the URLs under one heading at a time.

Done when: every URL in the block appeared in the host table, groups match the plan, and the block is the last thing in your reply.

## Reference: reading rules

- The copy is only for this run; delete `$tmp` afterwards.
- When a query fails because the database is locked or incomplete, ask me to close the browser and copy the profile again.
- On Firefox, `places.sqlite` is the database; the host table comes from `p.url` grouped by host, not from `visit_count` alone.
- Never read `Cookies`, `Login Data`, `Web Data` or any other profile file.
