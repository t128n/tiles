#!/usr/bin/env bun
import { Database } from "bun:sqlite"
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs"
import { homedir, platform, tmpdir } from "node:os"
import { basename, dirname, join } from "node:path"

const CHROME_EPOCH_OFFSET_MS = 11_644_473_600_000

interface Profile {
  browser: string
  profile: string
  displayName?: string
  path: string
  updated: number
}

interface Options {
  history?: string
  profile?: string
  browser?: string
  days: number
  minVisits: number
  limit: number
  scan: number
  includeLocal: boolean
  includeTitles: boolean
  listProfiles: boolean
  help: boolean
}

interface HistoryRow {
  url: string
  title?: string
  last: string
  visits: number
}

interface Site {
  host: string
  origin: string
  visits: number
  lastVisit: number
  topVisits: number
  title?: string
}

function usage(): string {
  return `Suggest tiles from a local Chromium browser's history.

Usage:
  bun scripts/chrome-history.ts [options]

Options:
  --history <path>     Read this History file instead of discovering a profile.
  --profile <name>     Pick a profile by name, or by "Browser/profile".
  --browser <name>     Limit discovery to Chrome, Edge, Brave or Chromium.
  --days <n>           Only count visits from the last n days. Default: 90.
  --min-visits <n>     Keep sites with at least n visits in that window. Default: 5.
  --limit <n>          Return at most n sites. Default: 60.
  --scan <n>           Scan at most n URLs before grouping. Default: 3000.
  --include-local      Include localhost and intranet hosts.
  --include-titles     Include page titles. They can reveal private content.
  --list-profiles      List discovered profiles and exit.
  --help               Show this help.

Privacy:
  The script only reads a temporary copy of the history database. It never writes
  to the browser profile and never sends anything over the network. It reports
  domains and visit counts, not page paths. Ask before reading someone's history.
`
}

function valueOf(args: string[], index: number, name: string): [string, number] {
  const argument = args[index]
  if (argument.includes("=")) {
    return [argument.slice(argument.indexOf("=") + 1), index]
  }
  const value = args[index + 1]
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${name} needs a value.`)
  }
  return [value, index + 1]
}

function integer(value: string, name: string, minimum: number): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(`${name} must be a whole number of at least ${minimum}.`)
  }
  return parsed
}

function parseOptions(args: string[]): Options {
  const parsed: Options = {
    days: 90,
    minVisits: 5,
    limit: 60,
    scan: 3000,
    includeLocal: false,
    includeTitles: false,
    listProfiles: false,
    help: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--help" || argument === "-h") {
      parsed.help = true
      continue
    }
    if (argument === "--include-local") {
      parsed.includeLocal = true
      continue
    }
    if (argument === "--include-titles") {
      parsed.includeTitles = true
      continue
    }
    if (argument === "--list-profiles") {
      parsed.listProfiles = true
      continue
    }

    if (argument === "--history" || argument.startsWith("--history=")) {
      const [value, next] = valueOf(args, index, "--history")
      parsed.history = value
      index = next
      continue
    }
    if (argument === "--profile" || argument.startsWith("--profile=")) {
      const [value, next] = valueOf(args, index, "--profile")
      parsed.profile = value
      index = next
      continue
    }
    if (argument === "--browser" || argument.startsWith("--browser=")) {
      const [value, next] = valueOf(args, index, "--browser")
      parsed.browser = value
      index = next
      continue
    }
    if (argument === "--days" || argument.startsWith("--days=")) {
      const [value, next] = valueOf(args, index, "--days")
      parsed.days = integer(value, "--days", 1)
      index = next
      continue
    }
    if (argument === "--min-visits" || argument.startsWith("--min-visits=")) {
      const [value, next] = valueOf(args, index, "--min-visits")
      parsed.minVisits = integer(value, "--min-visits", 1)
      index = next
      continue
    }
    if (argument === "--limit" || argument.startsWith("--limit=")) {
      const [value, next] = valueOf(args, index, "--limit")
      parsed.limit = integer(value, "--limit", 1)
      index = next
      continue
    }
    if (argument === "--scan" || argument.startsWith("--scan=")) {
      const [value, next] = valueOf(args, index, "--scan")
      parsed.scan = integer(value, "--scan", 1)
      index = next
      continue
    }

    throw new Error(`Unknown option: ${argument}`)
  }

  return parsed
}

function roots(): { browser: string; root: string }[] {
  const local = process.env.LOCALAPPDATA
  const config = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config")
  const mac = join(homedir(), "Library", "Application Support")

  const candidates: [string, string | undefined][] =
    platform() === "win32"
      ? [
          ["Chrome", local && join(local, "Google", "Chrome", "User Data")],
          ["Edge", local && join(local, "Microsoft", "Edge", "User Data")],
          [
            "Brave",
            local && join(local, "BraveSoftware", "Brave-Browser", "User Data"),
          ],
          ["Chromium", local && join(local, "Chromium", "User Data")],
          ["Helium", local && join(local, "imput", "Helium", "User Data")],
        ]
      : platform() === "darwin"
        ? [
            ["Chrome", join(mac, "Google", "Chrome")],
            ["Edge", join(mac, "Microsoft Edge")],
            ["Brave", join(mac, "BraveSoftware", "Brave-Browser")],
            ["Chromium", join(mac, "Chromium")],
          ]
        : [
            ["Chrome", join(config, "google-chrome")],
            ["Edge", join(config, "microsoft-edge")],
            ["Brave", join(config, "BraveSoftware", "Brave-Browser")],
            ["Chromium", join(config, "chromium")],
          ]

  return candidates
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .filter(([, root]) => existsSync(root))
    .map(([browser, root]) => ({ browser, root }))
}

function discover(): Profile[] {
  const profiles: Profile[] = []
  for (const { browser, root } of roots()) {
    let entries
    try {
      entries = readdirSync(root, { withFileTypes: true })
    } catch {
      continue
    }

    const names: Record<string, string> = {}
    try {
      const state = JSON.parse(
        readFileSync(join(root, "Local State"), "utf8"),
      ) as {
        profile?: {
          info_cache?: Record<string, { name?: string }>
        }
      }
      for (const [folder, info] of Object.entries(
        state.profile?.info_cache ?? {},
      )) {
        if (info?.name?.trim()) names[folder] = info.name.trim()
      }
    } catch {
      // Older Chromium builds may not have a readable Local State.
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const path = join(root, entry.name, "History")
      if (!existsSync(path)) continue
      try {
        profiles.push({
          browser,
          profile: entry.name,
          displayName: names[entry.name],
          path,
          updated: statSync(path).mtimeMs,
        })
      } catch {
        // A locked or unreadable profile is skipped.
      }
    }
  }
  return profiles.sort((left, right) => right.updated - left.updated)
}

function choose(profiles: Profile[], options: Options): Profile | string {
  if (options.history) {
    const path = options.history
    const file = existsSync(path) && statSync(path).isDirectory()
      ? join(path, "History")
      : path
    if (!existsSync(file)) return `No History file at ${file}.`
    return {
      browser: "Custom",
      profile: basename(dirname(file)),
      path: file,
      updated: statSync(file).mtimeMs,
    }
  }

  if (profiles.length === 0) {
    return "No Chromium history was found. Close the browser or pass --history <path>."
  }

  let candidates = profiles
  if (options.browser) {
    const needle = options.browser.toLowerCase()
    candidates = candidates.filter((profile) =>
      profile.browser.toLowerCase().includes(needle),
    )
  }
  if (options.profile) {
    const needle = options.profile.toLowerCase()
    candidates = candidates.filter((profile) => {
      const names = [
        profile.profile,
        profile.displayName,
        `${profile.browser}/${profile.profile}`,
        `${profile.browser}/${profile.displayName}`,
      ].filter((name): name is string => Boolean(name))
      return (
        names.some((name) => name.toLowerCase() === needle) ||
        profile.path.toLowerCase() === needle
      )
    })
  }

  if (candidates.length === 0) {
    return "No profile matched. Run with --list-profiles to see the choices."
  }
  return candidates[0]
}

function chromeTimeToMs(value: string): number {
  try {
    return Number(BigInt(value) / 1000n - BigInt(CHROME_EPOCH_OFFSET_MS))
  } catch {
    return 0
  }
}

function isLocal(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host === "::1" ||
    !host.includes(".")
  )
}

function readSites(profile: Profile, options: Options): Site[] {
  const directory = mkdtempSync(join(tmpdir(), "tiles-history-"))
  const database = join(directory, "History")

  try {
    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
      const source = `${profile.path}${suffix}`
      if (existsSync(source)) copyFileSync(source, `${database}${suffix}`)
    }

    const db = new Database(database, { readonly: true })
    try {
      const cutoff =
        (BigInt(Date.now() - options.days * 86_400_000) +
          BigInt(CHROME_EPOCH_OFFSET_MS)) *
        1000n

      const title = options.includeTitles ? "urls.title AS title," : ""
      const rows = db
        .query(
          `SELECT urls.url AS url,
                  ${title}
                  CAST(MAX(visits.visit_time) AS TEXT) AS last,
                  COUNT(visits.id) AS visits
           FROM urls
           JOIN visits ON visits.url = urls.id
           WHERE visits.visit_time >= ${cutoff.toString()}
             AND (urls.url LIKE 'http://%' OR urls.url LIKE 'https://%')
           GROUP BY urls.id
           ORDER BY visits DESC
           LIMIT ${options.scan}`,
        )
        .all() as HistoryRow[]

      const sites = new Map<string, Site>()
      for (const row of rows) {
        let url: URL
        try {
          url = new URL(row.url)
        } catch {
          continue
        }
        if (url.protocol !== "http:" && url.protocol !== "https:") continue

        const host = url.hostname.replace(/^www\./i, "").toLowerCase()
        if (!options.includeLocal && isLocal(host)) continue

        const visits = Number(row.visits)
        const lastVisit = chromeTimeToMs(row.last)
        const site = sites.get(host) ?? {
          host,
          origin: url.origin,
          visits: 0,
          lastVisit: 0,
          topVisits: 0,
        }

        site.visits += visits
        site.lastVisit = Math.max(site.lastVisit, lastVisit)
        if (visits > site.topVisits) {
          site.topVisits = visits
          site.origin = url.origin
          site.title = row.title?.trim() || undefined
        }
        sites.set(host, site)
      }

      return [...sites.values()]
        .filter((site) => site.visits >= options.minVisits)
        .sort(
          (left, right) =>
            right.visits - left.visits || right.lastVisit - left.lastVisit,
        )
        .slice(0, options.limit)
    } finally {
      db.close()
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

function main() {
  const configuration = (() => {
    try {
      return parseOptions(process.argv.slice(2))
    } catch (error) {
      console.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }),
      )
      process.exitCode = 1
      return null
    }
  })()
  if (!configuration) return

  if (configuration.help) {
    console.log(usage())
    return
  }

  const profiles = discover()
  if (configuration.listProfiles) {
    console.log(
      JSON.stringify(
        {
          profiles: profiles.map((profile) => ({
            browser: profile.browser,
            name: profile.displayName ?? profile.profile,
            folder: profile.profile,
            updated: new Date(profile.updated).toISOString(),
          })),
        },
        null,
        2,
      ),
    )
    return
  }

  const selected = choose(profiles, configuration)
  if (typeof selected === "string") {
    console.error(JSON.stringify({ error: selected }))
    process.exitCode = 1
    return
  }

  try {
    const sites = readSites(selected, configuration)
    console.log(
      JSON.stringify(
        {
          source: {
            browser: selected.browser,
            profile: selected.displayName ?? selected.profile,
          },
          windowDays: configuration.days,
          minVisits: configuration.minVisits,
          generatedAt: new Date().toISOString(),
          sites: sites.map((site) => ({
            host: site.host,
            origin: site.origin,
            visits: site.visits,
            lastVisit: new Date(site.lastVisit).toISOString(),
            ...(configuration.includeTitles && site.title
              ? { title: site.title.slice(0, 160) }
              : {}),
          })),
          ...(sites.length === 0
            ? {
                note: "No sites matched. Lower --min-visits or widen --days.",
              }
            : {}),
        },
        null,
        2,
      ),
    )
  } catch (error) {
    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        hint: "Close the browser or pass --history <path> to a copy of its History file.",
      }),
    )
    process.exitCode = 1
  }
}

main()
