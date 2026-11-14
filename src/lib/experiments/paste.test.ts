import { describe, expect, test } from "vitest"
import { canonical, collectUrls } from "../suggestions"
import type { Board } from "../types"
import { hasMultipleUrls, parseUrlList, PASTE_LIMIT } from "./paste"

const empty = new Set<string>()

function boardWith(urls: string[]): Board {
  return {
    version: 1,
    groups: [
      {
        id: "g1",
        title: "Pinned",
        tiles: urls.map((url, index) => ({
          id: `l${index}`,
          kind: "link" as const,
          title: "Existing",
          url,
        })),
      },
    ],
  }
}

describe("pasted URL lists", () => {
  test("reads links across newlines and spaces", () => {
    const parsed = parseUrlList(
      "https://a.example\nhttps://b.example  https://c.example",
      empty,
    )
    expect(parsed.links.map((link) => link.url)).toEqual([
      "https://a.example/",
      "https://b.example/",
      "https://c.example/",
    ])
    expect(parsed.links.map((link) => link.title)).toEqual([
      "a.example",
      "b.example",
      "c.example",
    ])
    expect(parsed.invalid).toBe(0)
    expect(parsed.duplicates).toBe(0)
  })

  test("accepts bare hosts and ignores stray words", () => {
    const parsed = parseUrlList("github.com\nhello there mdn.dev", empty)
    expect(parsed.links.map((link) => link.url)).toEqual([
      "https://github.com/",
      "https://mdn.dev/",
    ])
    expect(parsed.invalid).toBe(0)
  })

  test("counts address-shaped tokens that cannot be normalized", () => {
    const parsed = parseUrlList("http:// github.com", empty)
    expect(parsed.links).toHaveLength(1)
    expect(parsed.invalid).toBe(1)
  })

  test("counts duplicates inside the paste and on the board", () => {
    const existing = collectUrls(boardWith(["https://github.com/"]))
    const parsed = parseUrlList(
      "github.com github.com https://github.com/ https://new.example",
      existing,
    )
    expect(parsed.links.map((link) => link.url)).toEqual([
      "https://new.example/",
    ])
    expect(parsed.duplicates).toBe(3)
  })

  test("treats the canonical form as the identity", () => {
    const existing = collectUrls(boardWith(["https://github.com/path"]))
    const parsed = parseUrlList("https://www.github.com/path#readme", existing)
    expect(parsed.links).toHaveLength(0)
    expect(parsed.duplicates).toBe(1)
    expect(canonical("https://www.github.com/path#readme")).toBe(
      "https://github.com/path",
    )
  })

  test("caps the batch and reports the overflow", () => {
    const text = Array.from(
      { length: PASTE_LIMIT + 5 },
      (_, index) => `site${index}.example`,
    ).join("\n")
    const parsed = parseUrlList(text, empty)
    expect(parsed.links).toHaveLength(PASTE_LIMIT)
    expect(parsed.overflow).toBe(5)
  })

  test("invalid tokens do not use up the batch", () => {
    const text = `${"nope ".repeat(10)}${Array.from(
      { length: 3 },
      (_, index) => `site${index}.example`,
    ).join(" ")}`
    const parsed = parseUrlList(text, empty)
    expect(parsed.links).toHaveLength(3)
    expect(parsed.overflow).toBe(0)
    expect(parsed.invalid).toBe(0)
  })

  test("recognises a multi-URL paste", () => {
    expect(hasMultipleUrls("github.com mdn.dev")).toBe(true)
    expect(hasMultipleUrls("github.com")).toBe(false)
    expect(hasMultipleUrls("hello world")).toBe(false)
  })
})
