/**
 * The Algolia Hacker News API is CORS-open, so the browser can read the front
 * page directly. hnrss.org is not, which is why this does not use it.
 */
export const HN_FRONT_PAGE_API =
  "https://hn.algolia.com/api/v1/search?tags=front_page"

export interface HnStory {
  id: string
  title: string
  url: string
  points: number
  comments: number
  author?: string
}

interface AlgoliaHit {
  objectID?: unknown
  title?: unknown
  story_title?: unknown
  url?: unknown
  points?: unknown
  num_comments?: unknown
  author?: unknown
}

function safeUrl(value: unknown, id: string): string {
  if (typeof value === "string") {
    try {
      const url = new URL(value)
      if (url.protocol === "http:" || url.protocol === "https:") return url.href
    } catch {
      // Fall back to the discussion thread below.
    }
  }
  return `https://news.ycombinator.com/item?id=${encodeURIComponent(id)}`
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : 0
}

export function parseFrontPage(payload: unknown): HnStory[] {
  const hits = (payload as { hits?: unknown } | null)?.hits
  if (!Array.isArray(hits)) {
    throw new Error("Hacker News returned an unexpected payload.")
  }

  const stories: HnStory[] = []
  const seen = new Set<string>()
  for (const entry of hits) {
    if (!entry || typeof entry !== "object") continue
    const hit = entry as AlgoliaHit
    const id = typeof hit.objectID === "string" ? hit.objectID : ""
    const title =
      (typeof hit.title === "string" ? hit.title : "") ||
      (typeof hit.story_title === "string" ? hit.story_title : "")
    if (!id || !title.trim() || seen.has(id)) continue
    seen.add(id)
    stories.push({
      id,
      title: title.trim().slice(0, 240),
      url: safeUrl(hit.url, id),
      points: count(hit.points),
      comments: count(hit.num_comments),
      ...(typeof hit.author === "string" && hit.author
        ? { author: hit.author.slice(0, 80) }
        : {}),
    })
    if (stories.length >= 40) break
  }
  return stories
}

export interface FetchFrontPageOptions {
  signal?: AbortSignal
  fetcher?: typeof fetch
}

export async function fetchFrontPage(
  options: FetchFrontPageOptions = {},
): Promise<HnStory[]> {
  const fetcher = options.fetcher ?? fetch
  const response = await fetcher(HN_FRONT_PAGE_API, {
    signal: options.signal,
    headers: { accept: "application/json" },
  })
  if (!response.ok) {
    throw new Error(`Hacker News returned ${response.status}.`)
  }
  return parseFrontPage(await response.json())
}
