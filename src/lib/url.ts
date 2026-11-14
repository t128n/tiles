const schemePattern = /^[a-zA-Z][a-zA-Z\d+.-]*:/
const hostPortPattern = /^[^/\s:]+:\d+(\/|$)/
const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:[/?#].*)?$/
const hostPattern =
  /^(?:[\p{L}\d](?:[\p{L}\d-]*[\p{L}\d])?\.)+\p{L}{2,24}(?::\d+)?(?:[/?#].*)?$/u

/**
 * A typed address, not merely anything containing a dot: `1.5*2` and `2.55`
 * are expressions or numbers, while `example.com` and `192.168.1.10` are hosts.
 */
export function looksLikeUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || /\s/.test(trimmed)) return false
  return (
    schemePattern.test(trimmed) ||
    hostPattern.test(trimmed) ||
    ipv4Pattern.test(trimmed)
  )
}

function hasScheme(value: string): boolean {
  return schemePattern.test(value) && !hostPortPattern.test(value)
}

export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const candidate = hasScheme(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return url.href
  } catch {
    return null
  }
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function faviconFor(url: string): string | null {
  return iconUrlsFor(url)[0] ?? null
}

export function iconUrlsFor(url: string): string[] {
  try {
    const origin = new URL(url).origin
    return [
      `${origin}/apple-touch-icon.png`,
      `${origin}/favicon.ico`,
      `${origin}/assets/favicon.ico`,
    ]
  } catch {
    return []
  }
}

export function titleFromUrl(url: string): string {
  return hostnameOf(url) || "Untitled"
}

export type SearchEngine =
  | "duckduckgo"
  | "google"
  | "bing"
  | "brave"
  | "startpage"

export const SEARCH_ENGINES: readonly {
  value: SearchEngine
  label: string
  url: (query: string) => string
}[] = [
  {
    value: "duckduckgo",
    label: "DuckDuckGo",
    url: (query) => `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
  },
  {
    value: "google",
    label: "Google",
    url: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    value: "bing",
    label: "Bing",
    url: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    value: "brave",
    label: "Brave Search",
    url: (query) => `https://search.brave.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    value: "startpage",
    label: "Startpage",
    url: (query) =>
      `https://www.startpage.com/sp/search?query=${encodeURIComponent(query)}`,
  },
]

export function searchTarget(
  query: string,
  engine: SearchEngine = "duckduckgo",
): string | null {
  const trimmed = query.trim()
  if (!trimmed) return null

  const direct = normalizeUrl(trimmed)

  if (looksLikeUrl(trimmed) && direct) return direct

  const selected = SEARCH_ENGINES.find((entry) => entry.value === engine)
  return (selected ?? SEARCH_ENGINES[0]).url(trimmed)
}

export function navigate(url: string) {
  window.location.assign(url)
}
