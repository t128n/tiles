import { afterEach, describe, expect, test, vi } from "vitest"
import type { StorageLike } from "./board.svelte"
import { createBoardStore } from "./board.svelte"
import { registerTilesTools } from "./webmcp"
import type { Board } from "./types"

type Tool = {
  name: string
  execute: (input: unknown) => unknown
}

const board: Board = {
  version: 1,
  groups: [
    {
      id: "g1",
      title: "Work",
      tiles: [
        {
          id: "l1",
          kind: "link",
          title: "GitHub",
          url: "https://github.com/",
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

function installModelContext() {
  const tools = new Map<string, Tool>()
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: {
      registerTool: (tool: Tool) => {
        tools.set(tool.name, tool)
        return Promise.resolve()
      },
    },
  })
  return tools
}

afterEach(() => {
  Reflect.deleteProperty(document, "modelContext")
  vi.restoreAllMocks()
})

describe("WebMCP tiles tools", () => {
  test("registers tiles_list and tiles_apply_suggestions", () => {
    const tools = installModelContext()
    const store = createBoardStore({ storage: memory(board), createId: ids() })
    const unregister = registerTilesTools(store)
    expect([...tools.keys()].sort()).toEqual([
      "tiles_apply_suggestions",
      "tiles_list",
    ])
    unregister()
  })

  test("lists groups, tiles and URLs", () => {
    const tools = installModelContext()
    const store = createBoardStore({ storage: memory(board), createId: ids() })
    registerTilesTools(store)

    const result = tools.get("tiles_list")!.execute({}) as {
      groups: { title: string; tiles: { title: string }[] }[]
      urls: string[]
    }
    expect(result.groups[0].title).toBe("Work")
    expect(result.groups[0].tiles[0].title).toBe("GitHub")
    expect(result.urls).toEqual(["https://github.com/"])
  })

  test("previews without writing and applies only after confirmation", () => {
    const tools = installModelContext()
    const storage = memory(board)
    const store = createBoardStore({ storage, createId: ids() })
    registerTilesTools(store)
    const tool = tools.get("tiles_apply_suggestions")!

    const dry = tool.execute({
      groups: [
        {
          title: "Work",
          links: [
            { title: "Figma", url: "figma.com" },
            { title: "GitHub again", url: "github.com" },
          ],
        },
        {
          title: "Reading",
          links: [{ title: "Example", url: "example.com" }],
        },
      ],
      dryRun: true,
    }) as {
      ok: boolean
      plan: { summary: { groups: number; links: number }; duplicates: unknown[] }
    }
    expect(dry.ok).toBe(true)
    expect(dry.plan.summary).toEqual({ groups: 2, links: 2 })
    expect(dry.plan.duplicates).toHaveLength(1)
    expect(store.board.groups).toHaveLength(1)

    const defaultPreview = tool.execute({
      groups: [{ title: "Reading", links: [{ title: "Example", url: "example.com" }] }],
    }) as { ok: boolean; dryRun: boolean }
    expect(defaultPreview.ok).toBe(true)
    expect(defaultPreview.dryRun).toBe(true)
    expect(store.board.groups).toHaveLength(1)

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true)
    const applied = tool.execute({
      groups: [
        {
          title: "Work",
          links: [{ title: "Figma", url: "figma.com" }],
        },
        {
          title: "Reading",
          links: [{ title: "Example", url: "example.com" }],
        },
      ],
      dryRun: false,
    }) as { ok: boolean; applied: boolean; result: { addedGroups: string[] } }
    expect(confirm).toHaveBeenCalledOnce()
    expect(applied.ok).toBe(true)
    expect(applied.applied).toBe(true)
    expect(applied.result.addedGroups).toEqual(["Reading"])
    expect(store.board.groups).toHaveLength(2)
    expect(storage.value).toContain("Figma")
  })

  test("does not write when the person declines", () => {
    const tools = installModelContext()
    const store = createBoardStore({ storage: memory(board), createId: ids() })
    registerTilesTools(store)
    vi.spyOn(window, "confirm").mockReturnValue(false)

    const result = tools.get("tiles_apply_suggestions")!.execute({
      groups: [{ title: "Reading", links: [{ title: "Example", url: "example.com" }] }],
      dryRun: false,
    }) as { ok: boolean; applied: boolean }

    expect(result.ok).toBe(false)
    expect(result.applied).toBe(false)
    expect(store.board.groups).toHaveLength(1)
  })

  test("returns a helpful error for invalid input", () => {
    const tools = installModelContext()
    const store = createBoardStore({ storage: memory(board), createId: ids() })
    registerTilesTools(store)

    expect(
      tools.get("tiles_apply_suggestions")!.execute({ groups: "nope" }),
    ).toEqual({ ok: false, error: "groups must be a list." })
  })
})
