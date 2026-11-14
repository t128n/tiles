import { describe, expect, test } from "vitest"
import type { StorageLike } from "./board.svelte"
import { createBoardStore } from "./board.svelte"
import {
  applySuggestionPlan,
  collectUrls,
  planSuggestions,
} from "./suggestions"
import type { Board } from "./types"

const board: Board = {
  version: 1,
  groups: [
    {
      id: "g-work",
      title: "Work",
      tiles: [
        {
          id: "l-github",
          kind: "link",
          title: "GitHub",
          url: "https://github.com/",
        },
      ],
    },
    {
      id: "g-read",
      title: "Read later",
      tiles: [
        {
          id: "f-dev",
          kind: "folder",
          title: "Dev",
          links: [
            {
              id: "l-mdn",
              title: "MDN",
              url: "https://developer.mozilla.org/",
            },
          ],
        },
      ],
    },
  ],
}

function memory(initial: Board): StorageLike & { value: string | null } {
  let value = JSON.stringify(initial)
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

function ids() {
  let value = 0
  return () => `new-${++value}`
}

describe("tile suggestions", () => {
  test("plans new links, existing groups, duplicates and invalid URLs", () => {
    const plan = planSuggestions(board, [
      {
        title: "work",
        links: [
          { url: "https://www.github.com/" },
          { title: "Figma", url: "https://www.figma.com/" },
          { url: "javascript:alert(1)" },
        ],
      },
      {
        title: "Reading",
        links: [
          { title: "MDN", url: "https://developer.mozilla.org/" },
          { title: "Example", url: "example.com" },
        ],
      },
      {
        title: "Work",
        links: [{ title: "Linear", url: "https://linear.app/" }],
      },
    ])

    expect(plan.summary).toEqual({ groups: 2, links: 3 })
    expect(plan.groups.map((group) => group.title)).toEqual(["Work", "Reading"])
    expect(plan.groups[0].existing).toBe(true)
    expect(plan.groups[0].links.map((link) => link.title)).toEqual([
      "Figma",
      "Linear",
    ])
    expect(plan.groups[1].links.map((link) => link.title)).toEqual(["Example"])
    expect(plan.duplicates).toHaveLength(2)
    expect(plan.invalid).toHaveLength(1)
  })

  test("collects tile and folder link URLs", () => {
    expect([...collectUrls(board)].sort()).toEqual([
      "https://developer.mozilla.org/",
      "https://github.com/",
    ])
  })

  test("applies a plan once and persists the result", () => {
    const storage = memory(board)
    const store = createBoardStore({ storage, createId: ids() })
    const plan = planSuggestions(store.board, [
      {
        title: "Work",
        links: [
          { title: "Figma", url: "figma.com" },
          { title: "Linear", url: "linear.app" },
        ],
      },
      {
        title: "Reading",
        links: [{ title: "Example", url: "example.com" }],
      },
    ])

    const applied = applySuggestionPlan(store, plan)
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    expect(applied.result.addedGroups).toEqual(["Reading"])
    expect(applied.result.addedLinks).toHaveLength(3)

    const work = store.board.groups.find((group) => group.title === "Work")
    expect(work?.tiles.map((tile) => tile.title)).toEqual([
      "GitHub",
      "Figma",
      "Linear",
    ])
    const reading = store.board.groups.find((group) => group.title === "Reading")
    expect(reading?.tiles).toHaveLength(1)
    expect(storage.value).toContain("Figma")
    expect(storage.value).toContain("Example")
  })

  test("refuses to apply while the saved board is unreadable", () => {
    const storage: StorageLike = {
      getItem: () => "{broken",
      setItem: () => {},
    }
    const store = createBoardStore({ storage, createId: ids() })
    const plan = planSuggestions(board, [
      { title: "Work", links: [{ title: "Figma", url: "figma.com" }] },
    ])
    expect(applySuggestionPlan(store, plan)).toEqual({
      ok: false,
      error: "The saved tiles couldn't be read.",
    })
  })
})
