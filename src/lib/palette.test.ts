import { describe, expect, test } from "vitest"
import { collectLinks } from "./palette"
import type { Board } from "./types"

const board: Board = {
  version: 1,
  groups: [
    {
      id: "g1",
      title: "Work",
      tiles: [
        { id: "l1", kind: "link", title: "GitHub", url: "https://github.com/" },
        {
          id: "f1",
          kind: "folder",
          title: "Docs",
          links: [
            { id: "fl1", title: "MDN", url: "https://developer.mozilla.org/" },
            { id: "fl2", title: "Svelte", url: "https://svelte.dev/" },
          ],
        },
      ],
    },
  ],
}

describe("palette links", () => {
  test("collects top-level and folder links in board order", () => {
    expect(collectLinks(board)).toEqual([
      {
        id: "l1",
        title: "GitHub",
        url: "https://github.com/",
        host: "github.com",
        group: "Work",
      },
      {
        id: "fl1",
        title: "MDN",
        url: "https://developer.mozilla.org/",
        host: "developer.mozilla.org",
        group: "Work",
        folder: "Docs",
      },
      {
        id: "fl2",
        title: "Svelte",
        url: "https://svelte.dev/",
        host: "svelte.dev",
        group: "Work",
        folder: "Docs",
      },
    ])
  })

  test("handles an empty board", () => {
    expect(collectLinks({ version: 1, groups: [] })).toEqual([])
  })
})
