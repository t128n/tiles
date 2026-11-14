import { describe, expect, test } from "vitest"
import { EXPERIMENT_IDS } from "./ids"
import { EXPERIMENTS } from "./registry"

describe("experiment registry", () => {
  test("registers every known id exactly once", () => {
    const ids = EXPERIMENTS.map((experiment) => experiment.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect([...ids].sort()).toEqual([...EXPERIMENT_IDS].sort())
  })

  test("describes each experiment for the settings pane", () => {
    for (const experiment of EXPERIMENTS) {
      expect(experiment.title.trim()).not.toBe("")
      expect(experiment.description.trim()).not.toBe("")
      expect(experiment.description).not.toContain("\n")
      expect(experiment.terms.length).toBeGreaterThan(0)
    }
  })

  test("keeps the search order stable, calculator first", () => {
    const ids = EXPERIMENTS.map((experiment) => experiment.id)
    expect(ids.indexOf("calculator")).toBeLessThan(ids.indexOf("paste-links"))
    expect(
      EXPERIMENTS.filter((experiment) => experiment.resolveSearch)[0]?.id,
    ).toBe("calculator")
  })
})
