import { afterEach, describe, expect, test } from "vitest"
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  createSettingsStore,
  experimentEnabled,
  parseOwnerInput,
  type StorageLike,
} from "./settings.svelte"

function memory(initial?: string): StorageLike & { value: string | null } {
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

afterEach(() => {
  delete document.documentElement.dataset.theme
})

describe("settings", () => {
  test("starts with the defaults", () => {
    const settings = createSettingsStore({ storage: memory() })
    expect(settings.value).toEqual(DEFAULT_SETTINGS)
    expect(settings.value.experiments).toEqual({})
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  test("loads saved values and ignores unknown ones", () => {
    const settings = createSettingsStore({
      storage: memory(
        JSON.stringify({
          searchEngine: "google",
          theme: "dark",
          openLinksInNewTab: true,
        }),
      ),
    })
    expect(settings.value).toEqual({
      searchEngine: "google",
      theme: "dark",
      openLinksInNewTab: true,
      experiments: {},
      githubOwners: ["vercel-labs", "anomalyco"],
    })
    expect(document.documentElement.dataset.theme).toBe("dark")

    const invalid = createSettingsStore({
      storage: memory(
        JSON.stringify({ searchEngine: "nope", theme: "neon", other: true }),
      ),
    })
    expect(invalid.value).toEqual(DEFAULT_SETTINGS)
  })

  test("keeps known experiment flags and drops unknown ones", () => {
    const settings = createSettingsStore({
      storage: memory(
        JSON.stringify({
          experiments: {
            calculator: true,
            "paste-links": false,
            nope: true,
            hn: "yes",
          },
        }),
      ),
    })
    expect(settings.value.experiments).toEqual({
      calculator: true,
      "paste-links": false,
    })
    expect(experimentEnabled(settings.value, "calculator")).toBe(true)
    expect(experimentEnabled(settings.value, "paste-links")).toBe(false)
    expect(experimentEnabled(settings.value, "hn")).toBe(false)
  })

  test("carries the old HN toggles over to the experiments map", () => {
    const fromBoolean = createSettingsStore({
      storage: memory(JSON.stringify({ experimentalHn: true })),
    })
    expect(fromBoolean.value.experiments).toEqual({ hn: true })

    const fromRss = createSettingsStore({
      storage: memory(JSON.stringify({ experimentalRss: true })),
    })
    expect(fromRss.value.experiments).toEqual({ hn: true })

    const explicitFalse = createSettingsStore({
      storage: memory(
        JSON.stringify({ experimentalHn: false, experimentalRss: true }),
      ),
    })
    expect(explicitFalse.value.experiments).toEqual({ hn: false })

    const experimentsWin = createSettingsStore({
      storage: memory(
        JSON.stringify({ experiments: { hn: true }, experimentalHn: false }),
      ),
    })
    expect(experimentsWin.value.experiments).toEqual({ hn: true })
  })

  test("updates, persists and applies the theme", () => {
    const storage = memory()
    const settings = createSettingsStore({ storage })
    settings.update({ searchEngine: "brave", theme: "light" })
    expect(settings.value.searchEngine).toBe("brave")
    expect(document.documentElement.dataset.theme).toBe("light")
    expect(JSON.parse(storage.value ?? "{}").searchEngine).toBe("brave")

    settings.update({ theme: "system" })
    expect(document.documentElement.dataset.theme).toBeUndefined()

    settings.reset()
    expect(settings.value).toEqual(DEFAULT_SETTINGS)
    expect(storage.value).toContain("duckduckgo")
  })

  test("merges experiment updates without clobbering other ids", () => {
    const storage = memory()
    const settings = createSettingsStore({ storage })
    settings.update({ experiments: { calculator: true } })
    settings.update({
      experiments: { ...settings.value.experiments, "paste-links": true },
    })
    expect(settings.value.experiments).toEqual({
      calculator: true,
      "paste-links": true,
    })
    expect(JSON.parse(storage.value ?? "{}").experiments).toEqual({
      calculator: true,
      "paste-links": true,
    })
  })

  test("uses the stored key", () => {
    expect(SETTINGS_KEY).toBe("tiles:settings:v1")
  })

  test("defaults the GitHub owners and validates stored ones", () => {
    const fresh = createSettingsStore({ storage: memory() })
    expect(fresh.value.githubOwners).toEqual(["vercel-labs", "anomalyco"])

    const stored = createSettingsStore({
      storage: memory(JSON.stringify({ githubOwners: ["acme", "bad name", 7, "ACME", "-nope"] })),
    })
    expect(stored.value.githubOwners).toEqual(["acme"])

    const empty = createSettingsStore({
      storage: memory(JSON.stringify({ githubOwners: [] })),
    })
    expect(empty.value.githubOwners).toEqual([])
  })

  test("parses the owners field and caps it at ten", () => {
    expect(parseOwnerInput(" vercel-labs, anomalyco  acme ")).toEqual([
      "vercel-labs",
      "anomalyco",
      "acme",
    ])
    expect(parseOwnerInput("acme, ACME, acme")).toEqual(["acme"])

    const many = Array.from({ length: 15 }, (_, index) => `org-${index}`).join(", ")
    expect(parseOwnerInput(many)).toHaveLength(10)
  })
})
