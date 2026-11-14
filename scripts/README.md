# Chrome history helper

`chrome-history.ts` summarizes the sites a local Chromium browser visits most. It is used by the Suggest tiles prompt in Settings → Prompts.

CDP does not expose browser history, so the helper reads a **temporary copy** of the profile's `History` SQLite database. It never writes to the profile and never makes a network request. It reports domains and visit counts, not page paths.

## Usage

```bash
bun run history -- --days 90 --min-visits 5 --limit 60
bun run history:profiles
bun run history -- --profile "Chrome/Default"
bun run history -- --history "C:\path\to\History"
```

Options:

| Option | What it does |
| --- | --- |
| `--history <path>` | Read a specific `History` file or profile directory. |
| `--profile <name>` | Pick a profile by name, or by `Browser/profile`. |
| `--browser <name>` | Limit discovery to Chrome, Edge, Brave, Chromium or Helium. |
| `--days <n>` | Count visits from the last n days. Default 90. |
| `--min-visits <n>` | Keep sites with at least n visits. Default 5. |
| `--limit <n>` | Return at most n sites. Default 60. |
| `--scan <n>` | Scan at most n URLs before grouping. Default 3000. |
| `--include-local` | Include localhost and intranet hosts. |
| `--include-titles` | Include page titles. They can reveal private content. |
| `--list-profiles` | List discovered profiles and exit. |
| `--help` | Show all options and the privacy note. |

## Privacy

Browser history is sensitive. Ask the person before running the helper, do not paste its output into an external service, and do not show full profile paths or page titles unless they ask. Prefer hostnames and visit counts in the summary.

The script copies the SQLite database to the system temporary directory and removes the copy when it exits. If Chrome is holding a lock or the copy is incomplete, close the browser or pass `--history` to a copy made with the browser closed.

## Discovery

The helper looks for the usual profile locations for Chrome, Edge, Brave, Chromium and Helium on Windows, macOS and Linux. It selects the most recently used profile by default when run directly; the Suggest tiles prompt asks you to choose one first.
