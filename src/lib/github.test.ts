import { describe, expect, test, vi } from "vitest"
import {
  GITHUB_CACHE_KEY,
  GITHUB_CACHE_MS,
  GITHUB_RELEASE_REPOS,
  fetchOwner,
  fetchOwners,
  latestPerRepo,
  loadFeed,
  parseReleases,
  parseRepos,
  refreshFeed,
  relativeTime,
  repoItems,
  type GithubItem,
} from "./github"

type Storage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function memory(initial?: string): Storage & { value: string | null } {
  let value = initial ?? null
  return {
    get value() {
      return value
    },
    set value(next) {
      value = next
    },
    getItem: () => value,
    setItem: (_key, next) => {
      value = next
    },
  }
}

function response(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => payload,
  } as unknown as Response
}

const now = Date.parse("2026-11-14T12:00:00Z")

const repos = {
  repos: [
    {
      repo: "acme/lib",
      createdAt: "2026-11-10T00:00:00Z",
      pushedAt: "2026-11-14T00:00:00Z",
    },
    {
      repo: "acme/old",
      createdAt: "2020-01-01T00:00:00Z",
      pushedAt: "2026-11-13T00:00:00Z",
    },
    {
      repo: "acme/silent",
      createdAt: "2020-02-01T00:00:00Z",
      pushedAt: "2026-11-12T00:00:00Z",
    },
  ],
}

const releases = {
  releases: [
    { tag: "v2.0.0", name: "Lib 2.0", publishedAt: "2026-11-13T00:00:00Z" },
    { tag: "v0.1.0", name: "", publishedAt: "2020-01-01T00:00:00Z" },
  ],
}

function router(options: {
  org?: "repos" | 404
  user?: "repos" | 404
  release?: unknown
}) {
  return vi.fn(async (url: string | URL | Request) => {
    const target = String(url)
    if (target.includes("/orgs/")) {
      if (options.org === 404) return response({}, 404)
      return response(repos)
    }
    if (target.includes("/users/")) {
      if (options.user === 404) return response({}, 404)
      return response(repos)
    }
    return response(options.release ?? releases)
  }) as unknown as typeof fetch
}

describe("GitHub repositories and releases", () => {
  test("reads repository dates from the ungh payload", () => {
    expect(parseRepos(repos)).toEqual([
      {
        repo: "acme/lib",
        createdAt: "2026-11-10T00:00:00Z",
        pushedAt: "2026-11-14T00:00:00Z",
      },
      {
        repo: "acme/old",
        createdAt: "2020-01-01T00:00:00Z",
        pushedAt: "2026-11-13T00:00:00Z",
      },
      {
        repo: "acme/silent",
        createdAt: "2020-02-01T00:00:00Z",
        pushedAt: "2026-11-12T00:00:00Z",
      },
    ])
    expect(parseRepos({ repos: [null, {}, { repo: "" }] })).toEqual([])
    expect(parseRepos({ nope: true })).toEqual([])
  })

  test("keeps only recently created repositories", () => {
    expect(repoItems(parseRepos(repos), now)).toEqual([
      {
        id: "repo:acme/lib",
        kind: "repository",
        owner: "acme",
        repo: "lib",
        title: "lib",
        url: "https://github.com/acme/lib",
        createdAt: "2026-11-10T00:00:00Z",
      },
    ])
  })

  test("keeps recent releases and builds the tag URL", () => {
    const items = parseReleases("acme/lib", releases, now)
    expect(items).toEqual([
      {
        id: "release:acme/lib:v2.0.0",
        kind: "release",
        owner: "acme",
        repo: "lib",
        title: "Lib 2.0",
        url: "https://github.com/acme/lib/releases/tag/v2.0.0",
        createdAt: "2026-11-13T00:00:00Z",
      },
    ])
    expect(parseReleases("acme/lib", { releases: [] }, now)).toEqual([])
  })

  test("falls back from the org endpoint to the user endpoint", async () => {
    const fetcher = router({ org: 404, user: "repos" })
    const feed = await fetchOwner("acme", { fetcher, now })
    expect(feed.items.some((item) => item.kind === "repository")).toBe(true)
    expect(
      (fetcher as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0],
    ).toContain("/orgs/acme/repos")
  })

  test("reports an unknown owner when both endpoints miss", async () => {
    const fetcher = router({ org: 404, user: 404 })
    const feed = await fetchOwner("ghost", { fetcher, now })
    expect(feed.errors).toEqual([
      { owner: "ghost", message: "Unknown GitHub owner “ghost”." },
    ])
  })

  test("asks for releases of the most recently pushed repositories only", async () => {
    const many = {
      repos: Array.from({ length: 12 }, (_, index) => ({
        repo: `acme/repo-${index}`,
        createdAt: "2020-01-01T00:00:00Z",
        pushedAt: new Date(Date.UTC(2026, 10, 1, 0, index)).toISOString(),
      })),
    }
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const target = String(url)
      if (target.includes("/repos/")) return response(releases)
      return response(many)
    }) as unknown as typeof fetch

    await fetchOwner("acme", { fetcher, now })
    const releaseCalls = (
      fetcher as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls.filter(([url]) => String(url).includes("/releases")).length
    expect(releaseCalls).toBe(GITHUB_RELEASE_REPOS)
  })

  test("keeps repository items when a release request fails", async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const target = String(url)
      if (target.includes("/repos/")) throw new Error("offline")
      return response(repos)
    }) as unknown as typeof fetch

    const feed = await fetchOwner("acme", { fetcher, now })
    expect(feed.items).toEqual(repoItems(parseRepos(repos), now))
    expect(feed.errors).toEqual([])
  })

  test("merges, sorts and caps the feed", async () => {
    const many = {
      repos: Array.from({ length: 30 }, (_, index) => ({
        repo: `acme/repo-${index}`,
        createdAt: new Date(Date.UTC(2026, 10, 1, 0, index)).toISOString(),
        pushedAt: new Date(Date.UTC(2026, 10, 1, 0, index)).toISOString(),
      })),
    }
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const target = String(url)
      if (target.includes("/releases")) return response({ releases: [] })
      return response(many)
    }) as unknown as typeof fetch

    const feed = await fetchOwners(["acme"], { fetcher, now })
    expect(feed.items).toHaveLength(30)
    expect(feed.items[0].createdAt).toBe("2026-11-01T00:29:00.000Z")

    const wide = {
      repos: Array.from({ length: 60 }, (_, index) => ({
        repo: `acme/repo-${index}`,
        createdAt: new Date(Date.UTC(2026, 10, 1, 0, index)).toISOString(),
        pushedAt: new Date(Date.UTC(2026, 10, 1, 0, index)).toISOString(),
      })),
    }
    const wideFetch = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/releases")) return response({ releases: [] })
      return response(wide)
    }) as unknown as typeof fetch

    const capped = await fetchOwners(["acme"], {
      fetcher: wideFetch,
      now,
    })
    expect(capped.items).toHaveLength(40)
  })

  test("isolates a failing owner from the others", async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const target = String(url)
      if (target.includes("/orgs/ghost/")) return response({}, 404)
      if (target.includes("/users/ghost/")) return response({}, 404)
      if (target.includes("/releases")) return response({ releases: [] })
      return response(repos)
    }) as unknown as typeof fetch

    const feed = await fetchOwners(["ghost", "acme"], { fetcher, now })
    expect(feed.errors).toEqual([
      { owner: "ghost", message: "Unknown GitHub owner “ghost”." },
    ])
    expect(feed.items.some((item) => item.repo === "lib")).toBe(true)
  })

  test("keeps only the newest release of each repository", () => {
    const release = (repo: string, tag: string, createdAt: string): GithubItem => ({
      id: `release:${repo}:${tag}`,
      kind: "release",
      owner: repo.split("/")[0],
      repo: repo.split("/")[1],
      title: tag,
      url: `https://github.com/${repo}/releases/tag/${tag}`,
      createdAt,
    })
    const created: GithubItem = {
      id: "repo:acme/lib",
      kind: "repository",
      owner: "acme",
      repo: "lib",
      title: "lib",
      url: "https://github.com/acme/lib",
      createdAt: "2026-11-14T00:00:00Z",
    }

    const kept = latestPerRepo([
      release("acme/strobe", "0.41.0", "2026-11-14T10:00:00Z"),
      release("acme/strobe", "0.40.0", "2026-11-14T08:00:00Z"),
      release("acme/strobe", "0.39.0", "2026-11-14T06:00:00Z"),
      release("acme/other", "1.0.0", "2026-11-14T09:00:00Z"),
      created,
    ])

    expect(kept.map((item) => item.title)).toEqual([
      "0.41.0",
      "1.0.0",
      "lib",
    ])
    expect(kept[0].url).toBe("https://github.com/acme/strobe/releases/tag/0.41.0")
  })

  test("formats relative time from an explicit clock", () => {
    expect(relativeTime("2026-11-14T11:30:00Z", now)).toContain("30")
    expect(relativeTime("2026-11-14T09:00:00Z", now)).toContain("3")
    expect(relativeTime("2026-11-10T12:00:00Z", now)).toContain("4")
    expect(relativeTime("not a date", now)).toBe("")
  })
})

describe("GitHub cache", () => {
  const cached: GithubItem[] = [
    {
      id: "release:acme/lib:v2",
      kind: "release",
      owner: "acme",
      repo: "lib",
      title: "Lib 2",
      url: "https://github.com/acme/lib/releases/tag/v2",
      createdAt: "2026-11-13T00:00:00Z",
    },
  ]

  function entry(overrides: Record<string, unknown> = {}) {
    return JSON.stringify({
      fetchedAt: 1_000,
      owners: ["acme"],
      items: cached,
      errors: [],
      ...overrides,
    })
  }

  test("serves a fresh cache without a request", async () => {
    const storage = memory(entry())
    const fetcher = vi.fn() as unknown as typeof fetch

    const feed = await loadFeed(["acme"], {
      storage,
      fetcher,
      now: 1_000 + GITHUB_CACHE_MS - 1,
    })
    expect(feed).toEqual({ items: cached, errors: [] })
    expect(fetcher).not.toHaveBeenCalled()
  })

  test("remembers a cached failure for the same owners", async () => {
    const storage = memory(
      entry({ errors: [{ owner: "acme", message: "GitHub returned 500." }] }),
    )
    const fetcher = vi.fn() as unknown as typeof fetch

    const feed = await loadFeed(["acme"], { storage, fetcher, now: 1_001 })
    expect(feed.errors[0].message).toBe("GitHub returned 500.")
    expect(fetcher).not.toHaveBeenCalled()
  })

  test("ignores a cache for a different owner set", async () => {
    const storage = memory(entry())
    const fetcher = router({})
    const feed = await loadFeed(["other"], { storage, fetcher, now: 1_001 })
    expect(fetcher).toHaveBeenCalled()
    expect(feed.items.some((item) => item.repo === "lib")).toBe(true)
  })

  test("rejects a poisoned cache", async () => {
    const storage = memory(
      entry({
        items: [
          {
            ...cached[0],
            url: "javascript:alert(1)",
          },
        ],
      }),
    )
    const fetcher = router({})
    const feed = await loadFeed(["acme"], { storage, fetcher, now: 1_001 })
    expect(fetcher).toHaveBeenCalled()
    expect(feed.items.every((item) => item.url.startsWith("http"))).toBe(true)
  })

  test("caches empty results and failed owners", async () => {
    const storage = memory()
    const quiet = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/releases")) return response({ releases: [] })
      return response({ repos: [] })
    }) as unknown as typeof fetch

    await loadFeed(["acme"], { storage, fetcher: quiet, now: 5_000 })
    expect(storage.value).toContain("\"owners\":[\"acme\"]")

    const before = (
      quiet as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls.length
    await loadFeed(["acme"], { storage, fetcher: quiet, now: 5_001 })
    expect(
      (quiet as unknown as { mock: { calls: unknown[][] } }).mock.calls.length,
    ).toBe(before)

    const failing = vi.fn(async () => response({}, 404)) as unknown as typeof fetch
    const broken = memory()
    const feed = await refreshFeed(["acme"], {
      storage: broken,
      fetcher: failing,
      now: 5_000,
    })
    expect(feed.errors).toHaveLength(1)
    expect(broken.value).toContain("Unknown GitHub owner")
  })

  test("does not cache an aborted fetch", async () => {
    const controller = new AbortController()
    const storage = memory()
    const fetcher = vi.fn(async () => {
      controller.abort()
      return response(repos)
    }) as unknown as typeof fetch

    await refreshFeed(["acme"], {
      storage,
      fetcher,
      signal: controller.signal,
      now: 5_000,
    })
    expect(storage.value).toBeNull()
  })

  test("falls back to stale items when a refresh has nothing to show", async () => {
    const storage = memory(entry({ fetchedAt: 0 }))
    const fetcher = vi.fn(async () => response({}, 404)) as unknown as typeof fetch

    const feed = await loadFeed(["acme"], {
      storage,
      fetcher,
      now: GITHUB_CACHE_MS * 2,
    })
    expect(feed.items).toEqual(cached)
    expect(feed.errors[0].message).toContain("Unknown GitHub owner")
  })

  test("makes no request without owners", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch
    const feed = await loadFeed([], { storage: memory(), fetcher })
    expect(feed).toEqual({ items: [], errors: [] })
    expect(fetcher).not.toHaveBeenCalled()
  })

  test("uses its own cache key", () => {
    expect(GITHUB_CACHE_KEY).toBe("tiles:github:v1")
  })
})
