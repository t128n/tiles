/**
 * The tracker reads ungh.cc, a cached, CORS-open GitHub proxy. One repository
 * list per owner plus the releases of the most recently pushed repositories is
 * enough for a "what shipped recently" panel, and it is cached for ten minutes
 * so a normal day stays far below the shared service's comfort zone.
 */

export const UNGH_BASE = "https://ungh.cc"
export const GITHUB_CACHE_KEY = "tiles:github:v1"
export const GITHUB_CACHE_MS = 10 * 60 * 1000
export const GITHUB_MAX_ITEMS = 40
/** Releases and repositories older than this are not shown. */
export const GITHUB_RECENT_DAYS = 30
/** How many recently pushed repositories per owner are asked for releases. */
export const GITHUB_RELEASE_REPOS = 8

export interface GithubItem {
  id: string
  kind: "release" | "repository"
  owner: string
  repo: string
  title: string
  url: string
  createdAt: string
}

export interface GithubError {
  owner: string
  message: string
}

export interface GithubFeed {
  items: GithubItem[]
  errors: GithubError[]
}

/**
 * Keeps one entry per repository — its newest release — so a morning of patch
 * releases does not flood the panel. Repository creations stay on their own,
 * and the first occurrence wins because the feed is newest first.
 */
export function latestPerRepo(items: GithubItem[]): GithubItem[] {
  const seen = new Set<string>()
  const kept: GithubItem[] = []

  for (const item of items) {
    const key =
      item.kind === "release"
        ? `release:${item.owner}/${item.repo}`
        : `${item.kind}:${item.id}`
    if (seen.has(key)) continue
    seen.add(key)
    kept.push(item)
  }

  return kept
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface GithubOptions {
  signal?: AbortSignal
  fetcher?: typeof fetch
  storage?: StorageLike | null
  now?: number
}

interface CacheEntry {
  fetchedAt: number
  owners: string[]
  items: GithubItem[]
  errors: GithubError[]
}

interface RepoRef {
  repo: string
  createdAt: string
  pushedAt: string
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {}
}

function httpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null
  try {
    const url = new URL(value)
    if (url.protocol === "http:" || url.protocol === "https:") return url.href
  } catch {
    // Not an address.
  }
  return null
}

function recent(iso: string, now: number): boolean {
  const time = Date.parse(iso)
  if (!Number.isFinite(time)) return false
  return now - time <= GITHUB_RECENT_DAYS * 24 * 60 * 60 * 1000
}

export function parseRepos(payload: unknown): RepoRef[] {
  const repos = record(payload).repos
  if (!Array.isArray(repos)) return []
  const parsed: RepoRef[] = []
  for (const entry of repos) {
    const repo = readString(record(entry).repo)
    if (!repo) continue
    parsed.push({
      repo,
      createdAt: readString(record(entry).createdAt),
      pushedAt: readString(record(entry).pushedAt),
    })
  }
  return parsed
}

/** Repositories created within the window, newest first. */
export function repoItems(repos: RepoRef[], now: number): GithubItem[] {
  return repos
    .filter((repo) => recent(repo.createdAt, now))
    .map((repo) => {
      const [owner, name] = repo.repo.split("/")
      return {
        id: `repo:${repo.repo}`,
        kind: "repository" as const,
        owner: owner || repo.repo,
        repo: name || repo.repo,
        title: name || repo.repo,
        url: `https://github.com/${repo.repo}`,
        createdAt: repo.createdAt,
      }
    })
}

/** Releases published within the window, newest first. */
export function parseReleases(
  repo: string,
  payload: unknown,
  now: number,
): GithubItem[] {
  const releases = record(payload).releases
  if (!Array.isArray(releases)) return []
  const [owner, name] = repo.split("/")
  const items: GithubItem[] = []
  for (const entry of releases) {
    const release = record(entry)
    const tag = readString(release.tag)
    if (!tag) continue
    const createdAt = readString(release.publishedAt) || readString(release.createdAt)
    if (!recent(createdAt, now)) continue
    items.push({
      id: `release:${repo}:${tag}`,
      kind: "release",
      owner: owner || repo,
      repo: name || repo,
      title: (readString(release.name) || tag).slice(0, 240),
      url: `https://github.com/${repo}/releases/tag/${encodeURIComponent(tag)}`,
      createdAt,
    })
  }
  return items
}

export function relativeTime(iso: string, now = Date.now()): string {
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return ""
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
  const minutes = Math.round((then - now) / 60_000)
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour")
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 30) return formatter.format(days, "day")
  return formatter.format(Math.round(days / 30), "month")
}

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isItem(value: unknown): value is GithubItem {
  const item = record(value)
  return (
    typeof item.id === "string" &&
    (item.kind === "release" || item.kind === "repository") &&
    typeof item.owner === "string" &&
    typeof item.repo === "string" &&
    typeof item.title === "string" &&
    typeof item.createdAt === "string" &&
    httpUrl(item.url) === item.url
  )
}

function isError(value: unknown): value is GithubError {
  const error = record(value)
  return typeof error.owner === "string" && typeof error.message === "string"
}

function ownerKey(owners: string[]): string {
  return owners
    .map((owner) => owner.toLowerCase())
    .sort()
    .join(",")
}

function readCache(storage: StorageLike | null, now: number): CacheEntry | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(GITHUB_CACHE_KEY)
    if (!raw) return null
    const parsed = record(JSON.parse(raw))
    if (typeof parsed.fetchedAt !== "number") return null
    if (parsed.fetchedAt > now) return null
    if (!Array.isArray(parsed.owners) || !Array.isArray(parsed.items)) return null

    const seen = new Set<string>()
    const items: GithubItem[] = []
    for (const value of parsed.items) {
      if (!isItem(value) || seen.has(value.id)) return null
      seen.add(value.id)
      items.push(value)
    }

    const errors = Array.isArray(parsed.errors)
      ? parsed.errors.filter(isError)
      : []

    return {
      fetchedAt: parsed.fetchedAt,
      owners: parsed.owners.filter(
        (owner): owner is string => typeof owner === "string",
      ),
      items: items.slice(0, GITHUB_MAX_ITEMS),
      errors,
    }
  } catch {
    return null
  }
}

function writeCache(
  storage: StorageLike | null,
  entry: Omit<CacheEntry, "fetchedAt">,
  now: number,
): void {
  if (!storage) return
  try {
    storage.setItem(
      GITHUB_CACHE_KEY,
      JSON.stringify({
        fetchedAt: now,
        owners: entry.owners,
        items: entry.items.slice(0, GITHUB_MAX_ITEMS),
        errors: entry.errors,
      } satisfies CacheEntry),
    )
  } catch {
    // A full or blocked storage only costs the next request.
  }
}

function freshCache(
  storage: StorageLike | null,
  owners: string[],
  now: number,
): GithubFeed | null {
  const cached = readCache(storage, now)
  if (!cached) return null
  if (ownerKey(cached.owners) !== ownerKey(owners)) return null
  if (now - cached.fetchedAt > GITHUB_CACHE_MS) return null
  return { items: cached.items, errors: cached.errors }
}

async function loadRepos(
  owner: string,
  fetcher: typeof fetch,
  signal?: AbortSignal,
): Promise<{ ok: true; repos: RepoRef[] } | { ok: false; message: string }> {
  const endpoints = [
    `${UNGH_BASE}/orgs/${encodeURIComponent(owner)}/repos`,
    `${UNGH_BASE}/users/${encodeURIComponent(owner)}/repos`,
  ]

  for (const [index, endpoint] of endpoints.entries()) {
    let response: Response
    try {
      response = await fetcher(endpoint, {
        signal,
        headers: { accept: "application/json" },
      })
    } catch {
      return { ok: false, message: "Couldn’t reach GitHub." }
    }
    if (response.ok) {
      try {
        return { ok: true, repos: parseRepos(await response.json()) }
      } catch {
        return { ok: false, message: "GitHub returned an unexpected payload." }
      }
    }
    if (response.status === 404 && index === 0) continue
    if (response.status === 404) {
      return { ok: false, message: `Unknown GitHub owner “${owner}”.` }
    }
    return { ok: false, message: `GitHub returned ${response.status}.` }
  }

  return { ok: false, message: `Unknown GitHub owner “${owner}”.` }
}

async function loadReleases(
  repo: string,
  fetcher: typeof fetch,
  now: number,
  signal?: AbortSignal,
): Promise<GithubItem[]> {
  try {
    const response = await fetcher(
      `${UNGH_BASE}/repos/${repo}/releases`,
      { signal, headers: { accept: "application/json" } },
    )
    if (!response.ok) return []
    return parseReleases(repo, await response.json(), now)
  } catch {
    return []
  }
}

export async function fetchOwner(
  owner: string,
  options: GithubOptions = {},
): Promise<GithubFeed> {
  const fetcher = options.fetcher ?? fetch
  const now = options.now ?? Date.now()

  const repos = await loadRepos(owner, fetcher, options.signal)
  if (!repos.ok) {
    return { items: [], errors: [{ owner, message: repos.message }] }
  }

  const candidates = repos.repos
    .filter((repo) => Number.isFinite(Date.parse(repo.pushedAt)))
    .sort(
      (left, right) => Date.parse(right.pushedAt) - Date.parse(left.pushedAt),
    )
    .slice(0, GITHUB_RELEASE_REPOS)

  const releases = await Promise.all(
    candidates.map((repo) =>
      loadReleases(repo.repo, fetcher, now, options.signal),
    ),
  )

  return {
    items: [...repoItems(repos.repos, now), ...releases.flat()],
    errors: [],
  }
}

export async function fetchOwners(
  owners: string[],
  options: GithubOptions = {},
): Promise<GithubFeed> {
  const items: GithubItem[] = []
  const errors: GithubError[] = []
  const seen = new Set<string>()

  for (const owner of owners) {
    if (options.signal?.aborted) break
    const feed = await fetchOwner(owner, options)
    errors.push(...feed.errors)
    for (const item of feed.items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      items.push(item)
    }
  }

  items.sort(
    (left, right) =>
      (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0),
  )

  return { items: items.slice(0, GITHUB_MAX_ITEMS), errors }
}

function store(
  owners: string[],
  feed: GithubFeed,
  options: GithubOptions,
): GithubFeed {
  if (options.signal?.aborted) return feed
  const storage =
    options.storage === undefined ? browserStorage() : options.storage
  const now = options.now ?? Date.now()

  let items = feed.items
  if (items.length === 0 && feed.errors.length > 0) {
    const existing = readCache(storage, now)
    if (existing && ownerKey(existing.owners) === ownerKey(owners)) {
      items = existing.items
    }
  }

  writeCache(storage, { owners, items, errors: feed.errors }, now)
  return { items, errors: feed.errors }
}

/**
 * Serves the ten-minute cache when it is fresh for these owners, otherwise
 * fetches. A failure keeps the cache's items and records the errors.
 */
export async function loadFeed(
  owners: string[],
  options: GithubOptions = {},
): Promise<GithubFeed> {
  if (owners.length === 0) return { items: [], errors: [] }
  const storage =
    options.storage === undefined ? browserStorage() : options.storage
  const now = options.now ?? Date.now()

  const cached = freshCache(storage, owners, now)
  if (cached) return cached

  return store(owners, await fetchOwners(owners, options), options)
}

/** Bypasses the cache; the refresh button calls this. */
export async function refreshFeed(
  owners: string[],
  options: GithubOptions = {},
): Promise<GithubFeed> {
  if (owners.length === 0) return { items: [], errors: [] }
  return store(owners, await fetchOwners(owners, options), options)
}
