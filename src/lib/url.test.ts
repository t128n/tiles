import { describe, expect, test } from "vitest"
import {
  faviconFor,
  hostnameOf,
  iconUrlsFor,
  looksLikeUrl,
  normalizeUrl,
  searchTarget,
  titleFromUrl,
} from "./url"

describe("URLs", () => {
  test("normalizes http and https addresses", () => {
    expect(normalizeUrl("github.com")).toBe("https://github.com/")
    expect(normalizeUrl("https://example.com/a?b=1")).toBe(
      "https://example.com/a?b=1",
    )
    expect(normalizeUrl("http://localhost:5173")).toBe("http://localhost:5173/")
    expect(normalizeUrl("localhost:3000")).toBe("https://localhost:3000/")
    expect(normalizeUrl("example.com:8080/path")).toBe(
      "https://example.com:8080/path",
    )
  })

  test("rejects other protocols and empty input", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull()
    expect(normalizeUrl("mailto:hi@example.com")).toBeNull()
    expect(normalizeUrl("   ")).toBeNull()
  })

  test("derives hostnames, titles and favicons", () => {
    expect(hostnameOf("https://www.github.com/a")).toBe("github.com")
    expect(titleFromUrl("https://www.github.com/a")).toBe("github.com")
    expect(faviconFor("https://github.com/a")).toBe(
      "https://github.com/apple-touch-icon.png",
    )
    expect(iconUrlsFor("https://github.com/a")).toEqual([
      "https://github.com/apple-touch-icon.png",
      "https://github.com/favicon.ico",
      "https://github.com/assets/favicon.ico",
    ])
    expect(faviconFor("nope")).toBeNull()
  })

  test("tells hosts from expressions", () => {
    expect(looksLikeUrl("example.com")).toBe(true)
    expect(looksLikeUrl("sub.example.co.uk/path?q=1")).toBe(true)
    expect(looksLikeUrl("example.com:8080")).toBe(true)
    expect(looksLikeUrl("https://example.com")).toBe(true)
    expect(looksLikeUrl("192.168.1.10")).toBe(true)
    expect(looksLikeUrl("münchen.de")).toBe(true)

    expect(looksLikeUrl("1.5*2")).toBe(false)
    expect(looksLikeUrl("2.55")).toBe(false)
    expect(looksLikeUrl("0.1+0.2")).toBe(false)
    expect(looksLikeUrl("2^10")).toBe(false)
    expect(looksLikeUrl("svelte runes")).toBe(false)
    expect(looksLikeUrl("")).toBe(false)
  })

  test("keeps arithmetic out of the direct-URL path", () => {
    expect(searchTarget("1.5*2")).toBe("https://duckduckgo.com/?q=1.5*2")
    expect(searchTarget("2.55")).toBe("https://duckduckgo.com/?q=2.55")
  })

  test("chooses a direct URL or a DuckDuckGo search", () => {
    expect(searchTarget("github.com")).toBe("https://github.com/")
    expect(searchTarget("https://example.com/a")).toBe("https://example.com/a")
    expect(searchTarget("svelte runes")).toBe(
      "https://duckduckgo.com/?q=svelte%20runes",
    )
    expect(searchTarget("svelte runes", "google")).toBe(
      "https://www.google.com/search?q=svelte%20runes",
    )
    expect(searchTarget("svelte runes", "brave")).toBe(
      "https://search.brave.com/search?q=svelte%20runes",
    )
    expect(searchTarget("  ")).toBeNull()
  })
})
