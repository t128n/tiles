import { describe, expect, test } from "vitest"
import { PROMPTS, promptById } from "./prompts"

describe("prompts", () => {
  test("exposes both prompts with copyable text", () => {
    expect(PROMPTS.map((prompt) => prompt.id)).toEqual([
      "suggest-tiles",
      "board",
    ])
    for (const prompt of PROMPTS) {
      expect(prompt.title.length).toBeGreaterThan(0)
      expect(prompt.description.length).toBeGreaterThan(0)
      expect(prompt.text.length).toBeGreaterThan(200)
      expect(prompt.text).toContain("tiles:v1")
      expect(prompt.text).not.toContain("$ARGUMENTS")
    }
  })

  test("keeps the safety instructions", () => {
    const suggest = promptById("suggest-tiles")
    expect(suggest?.text).toContain("Add only")
    expect(suggest?.text).toContain("bun scripts/chrome-history.ts")
    expect(suggest?.text).toContain("dryRun: true")

    const board = promptById("board")
    expect(board?.text).toContain("browse")
    expect(board?.text).toContain("dry run")
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
