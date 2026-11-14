import { describe, expect, test } from "vitest"
import { DEFAULT_SETTINGS, type Settings } from "../settings.svelte"
import { resolveQuery } from "./route"

function settings(experiments: Settings["experiments"], engine?: Settings["searchEngine"]): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...(engine ? { searchEngine: engine } : {}),
    experiments,
  }
}

describe("query routing", () => {
  test("sends a typed address to itself", () => {
    expect(resolveQuery("github.com", settings({}))).toEqual({
      kind: "navigate",
      href: "https://github.com/",
      hint: null,
    })
  })

  test("an address wins over an enabled calculator", () => {
    expect(resolveQuery("example.com", settings({ calculator: true }))).toEqual({
      kind: "navigate",
      href: "https://example.com/",
      hint: null,
    })
  })

  test("an enabled calculator wins over the search engine", () => {
    expect(resolveQuery("18*3", settings({ calculator: true }))).toMatchObject({
      kind: "copy",
      value: "54",
    })
  })

  test("a disabled calculator falls through to the engine", () => {
    expect(resolveQuery("18*3", settings({}))).toEqual({
      kind: "navigate",
      href: "https://duckduckgo.com/?q=18*3",
      hint: null,
    })
  })

  test("uses the configured engine", () => {
    expect(resolveQuery("svelte runes", settings({}, "google"))).toEqual({
      kind: "navigate",
      href: "https://www.google.com/search?q=svelte%20runes",
      hint: null,
    })
  })

  test("returns nothing for an empty query", () => {
    expect(resolveQuery("   ", settings({ calculator: true }))).toBeNull()
  })
})
