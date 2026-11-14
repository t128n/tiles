import { describe, expect, test } from "vitest"
import { PROMPTS, promptById } from "./prompts"

describe("prompts", () => {
  test("exposes the suggest prompt with copyable text", () => {
    expect(PROMPTS.map((prompt) => prompt.id)).toEqual(["suggest-tiles"])
    for (const prompt of PROMPTS) {
      expect(prompt.title.length).toBeGreaterThan(0)
      expect(prompt.description.length).toBeGreaterThan(0)
      expect(prompt.text.length).toBeGreaterThan(200)
      expect(prompt.text).not.toContain("$ARGUMENTS")
    }
  })

  test("reads history with one local Node reader and no installs", () => {
    const suggest = promptById("suggest-tiles")
    expect(suggest?.text).toContain("node:sqlite")
    expect(suggest?.text).toContain("PowerShell")
    expect(suggest?.text).toContain("bash")
    expect(suggest?.text).toContain("Add links")
    expect(suggest?.text).not.toContain("chrome-history.ts")
    expect(suggest?.text).not.toContain("sqlite3")
    expect(suggest?.text).not.toContain("python")
    expect(suggest?.text).not.toContain("bun ")
  })

  test("keeps the safety and selection rules", () => {
    const suggest = promptById("suggest-tiles")
    expect(suggest?.text).toContain("Do not write to the board")
    expect(suggest?.text).toContain("Ask before reading history")
    expect(suggest?.text).toContain("Never default to the most recently used profile")
    expect(suggest?.text).toContain("temporary copy")
    expect(suggest?.text).toContain("Rank hosts by visits")
    expect(suggest?.text).toContain("A subdomain stands alone")
    expect(suggest?.text).toContain("Internal is opt-in, at most three")
  })

  test("gives every step a completion check", () => {
    for (const prompt of PROMPTS) {
      const steps = prompt.text.match(/^### \d+\./gm) ?? []
      const checks = prompt.text.match(/^Done when:/gm) ?? []
      expect(steps.length).toBeGreaterThan(0)
      expect(checks).toHaveLength(steps.length)
    }
  })

  test("returns undefined for unknown ids", () => {
    expect(promptById("nope")).toBeUndefined()
  })
})
