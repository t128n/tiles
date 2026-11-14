import { describe, expect, test } from "vitest"
import { HELP_DOCS } from "./help"

describe("help docs", () => {
  test("compiles every doc to a titled fragment", () => {
    expect(HELP_DOCS.map((doc) => doc.id)).toEqual([
      "getting-started",
      "browser-setup",
      "keyboard",
      "your-data",
    ])
    for (const doc of HELP_DOCS) {
      expect(doc.title.length).toBeGreaterThan(0)
      expect(doc.html).toContain("<h2")
      expect(doc.html).not.toContain("<h1")
    }
  })

  test("opens external links in a new tab", () => {
    const setup = HELP_DOCS.find((doc) => doc.id === "browser-setup")
    expect(setup?.html).toContain('target="_blank" rel="noreferrer"')
  })
})
