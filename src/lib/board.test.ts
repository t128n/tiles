import { describe, expect, test, vi } from "vitest"
import {
  countTiles,
  createInitialBoard,
  parseBoard,
  validateBoard,
} from "./board"
import { createBoardStore, STORAGE_KEY, type StorageLike } from "./board.svelte"
import type { Board } from "./types"

function ids() {
  let value = 0
  return () => `id-${++value}`
}

function memory(initial?: Board | string): StorageLike & { value: string | null } {
  let value =
    typeof initial === "string"
      ? initial
      : initial
        ? JSON.stringify(initial)
        : null
  return {
    get value() {
      return value
    },
    set value(next) {
      value = next
    },
    getItem() {
      return value
    },
    setItem(_key, next) {
      value = next
    },
  }
}

function seedBoard(): Board {
  return {
    version: 1,
    groups: [
      {
        id: "g1",
        title: "Pinned",
        tiles: [
          {
            id: "l1",
            kind: "link",
            title: "GitHub",
            url: "https://github.com/",
          },
          {
            id: "f1",
            kind: "folder",
            title: "Dev",
            links: [
              {
                id: "fl1",
                title: "MDN",
                url: "https://developer.mozilla.org/",
              },
            ],
          },
        ],
      },
      { id: "g2", title: "Work", tiles: [] },
    ],
  }
}

describe("board validation", () => {
  test("accepts a valid board and normalizes URLs", () => {
    const result = validateBoard({
      version: 1,
      groups: [
        {
          id: "g1",
          title: " Pinned ",
          tiles: [
            { id: "l1", kind: "link", url: "github.com" },
            { id: "f1", kind: "folder", title: "Dev", links: [] },
          ],
        },
      ],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.board.groups[0].title).toBe("Pinned")
    expect(result.board.groups[0].tiles[0]).toMatchObject({
      title: "github.com",
      url: "https://github.com/",
    })
  })

  test("rejects unsafe URLs, duplicate ids and bad shapes", () => {
    expect(
      validateBoard({
        version: 1,
        groups: [
          {
            id: "g1",
            title: "Pinned",
            tiles: [{ id: "l1", kind: "link", url: "javascript:alert(1)" }],
          },
        ],
      }).ok,
    ).toBe(false)

    expect(
      validateBoard({
        version: 1,
        groups: [
          {
            id: "same",
            title: "One",
            tiles: [{ id: "same", kind: "link", url: "example.com" }],
          },
        ],
      }).ok,
    ).toBe(false)

    expect(validateBoard({ version: 1, groups: "nope" }).ok).toBe(false)
  })

  test("parses stored JSON and reports broken JSON", () => {
    expect(parseBoard(JSON.stringify(seedBoard())).ok).toBe(true)
    expect(parseBoard("{nope").ok).toBe(false)
  })

  test("counts tiles", () => {
    expect(countTiles(seedBoard())).toBe(2)
    expect(countTiles(createInitialBoard(ids()))).toBe(0)
  })
})

describe("board store", () => {
  test("starts with one empty group and persists every change", () => {
    const storage = memory()
    const store = createBoardStore({ storage, createId: ids() })
    expect(store.board.groups).toHaveLength(1)
    expect(store.board.groups[0].title).toBe("Pinned")

    const groupId = store.board.groups[0].id
    const linkId = store.addLink(groupId, { title: "GitHub", url: "github.com" })
    expect(linkId).toBeTruthy()
    expect(store.board.groups[0].tiles).toHaveLength(1)

    const saved = JSON.parse(storage.value ?? "{}")
    expect(saved.groups[0].tiles[0]).toMatchObject({
      title: "GitHub",
      url: "https://github.com/",
    })
  })

  test("adds folders and links, and reorders folder links", () => {
    const store = createBoardStore({ storage: memory(), createId: ids() })
    const groupId = store.board.groups[0].id
    const folderId = store.addFolder(groupId, "Dev")
    expect(folderId).toBeTruthy()
    if (!folderId) return

    store.addFolderLink(groupId, folderId, { title: "MDN", url: "mdn.dev" })
    store.addFolderLink(groupId, folderId, { title: "Vite", url: "vite.dev" })

    const folder = store.board.groups[0].tiles[0]
    expect(folder.kind).toBe("folder")
    if (folder.kind !== "folder") return
    expect(folder.links).toHaveLength(2)

    store.reorderFolderLinks(folderId, [folder.links[1].id, folder.links[0].id])
    expect(store.board.groups[0].tiles[0]).toMatchObject({
      links: [
        { title: "Vite" },
        { title: "MDN" },
      ],
    })
  })

  test("moves tiles between groups and updates a link", () => {
    const store = createBoardStore({ storage: memory(seedBoard()), createId: ids() })
    expect(store.moveTile("g1", "l1", "g2")).toBe(true)
    expect(store.board.groups[0].tiles.map((tile) => tile.id)).toEqual(["f1"])
    expect(store.board.groups[1].tiles.map((tile) => tile.id)).toEqual(["l1"])

    expect(
      store.updateTile("g2", "l1", { title: "GitHub", url: "github.com/explore" }),
    ).toBe(true)
    expect(store.board.groups[1].tiles[0]).toMatchObject({
      title: "GitHub",
      url: "https://github.com/explore",
    })
  })

  test("reorders groups and tiles, keeping unknown ids at the end", () => {
    const store = createBoardStore({ storage: memory(seedBoard()), createId: ids() })
    store.reorderGroups(["g2"])
    expect(store.board.groups.map((group) => group.id)).toEqual(["g2", "g1"])

    store.reorderTiles("g1", ["f1"])
    expect(
      store.board.groups.find((group) => group.id === "g1")?.tiles.map((tile) => tile.id),
    ).toEqual(["f1", "l1"])
  })

  test("refuses to overwrite unreadable saved data", () => {
    const storage = memory("{broken")
    const store = createBoardStore({ storage, createId: ids() })
    expect(store.loadError).not.toBeNull()
    expect(store.addGroup("Work")).toBeNull()
    expect(storage.value).toBe("{broken")

    store.startFresh()
    expect(store.loadError).toBeNull()
    expect(store.board.groups).toHaveLength(1)
    expect(storage.value).not.toBe("{broken")
  })

  test("keeps changes in memory when saving fails", () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota")
      },
    }
    const store = createBoardStore({ storage, createId: ids() })
    const groupId = store.board.groups[0].id
    store.addLink(groupId, { title: "GitHub", url: "github.com" })
    expect(store.board.groups[0].tiles).toHaveLength(1)
    expect(store.saveError).toBeTruthy()
  })

  test("undoes a deleted tile until the next change", () => {
    const store = createBoardStore({ storage: memory(seedBoard()), createId: ids() })

    expect(store.removeTile("g1", "l1")).toBe(true)
    expect(store.undoEntry?.label).toBe("Deleted “GitHub”")
    expect(store.board.groups[0].tiles.map((tile) => tile.id)).toEqual(["f1"])

    expect(store.undo()).toBe(true)
    expect(store.undoEntry).toBeNull()
    expect(store.board.groups[0].tiles.map((tile) => tile.id)).toEqual([
      "l1",
      "f1",
    ])

    store.removeTile("g1", "l1")
    store.addGroup("Later")
    expect(store.undoEntry).toBeNull()
    expect(store.undo()).toBe(false)
    expect(store.board.groups.map((group) => group.title)).toContain("Later")
  })

  test("undoes a deleted group and a reset", () => {
    const store = createBoardStore({ storage: memory(seedBoard()), createId: ids() })
    const groupCount = store.board.groups.length

    expect(store.removeGroup("g1")).toBe(true)
    expect(store.undoEntry?.label).toBe("Deleted “Pinned”")
    store.undo()
    expect(store.board.groups).toHaveLength(groupCount)

    store.startFresh()
    expect(store.undoEntry?.label).toBe("Reset the board")
    expect(store.board.groups).toHaveLength(1)
    expect(store.undo()).toBe(true)
    expect(store.board.groups).toHaveLength(groupCount)
  })

  test("replaces the board from an imported backup, with undo", () => {
    const store = createBoardStore({ storage: memory(seedBoard()), createId: ids() })
    const imported: Board = {
      version: 1,
      groups: [
        {
          id: "imported",
          title: "Imported",
          tiles: [
            {
              id: "i1",
              kind: "link",
              title: "Example",
              url: "https://example.com/",
            },
          ],
        },
      ],
    }

    expect(store.replaceBoard(imported)).toBe(true)
    expect(store.board.groups.map((group) => group.title)).toEqual(["Imported"])
    expect(store.undoEntry?.label).toBe("Imported a backup")

    expect(store.undo()).toBe(true)
    expect(store.board.groups.map((group) => group.title)).not.toEqual([
      "Imported",
    ])
  })

  test("dismisses a pending undo", () => {
    const store = createBoardStore({ storage: memory(seedBoard()), createId: ids() })
    store.removeTile("g1", "l1")
    store.dismissUndo()
    expect(store.undoEntry).toBeNull()
    expect(store.undo()).toBe(false)
    expect(store.board.groups[0].tiles.map((tile) => tile.id)).toEqual(["f1"])
  })

  test("exports the stored board", () => {
    const store = createBoardStore({ storage: memory(seedBoard()), createId: ids() })
    expect(JSON.parse(store.exportRaw())).toMatchObject({ version: 1 })
  })

  test("uses the new storage key", () => {
    expect(STORAGE_KEY).toBe("tiles:v1")
  })

  test("adds a batch of links in one commit with one undo entry", () => {
    const storage = memory(seedBoard())
    const store = createBoardStore({ storage, createId: ids() })
    const writes = vi.spyOn(storage, "setItem")

    const added = store.addLinks("g1", [
      { title: "Svelte", url: "svelte.dev" },
      { title: "", url: "https://vite.dev/guide" },
    ])

    expect(added).toBe(2)
    expect(writes).toHaveBeenCalledTimes(1)
    expect(store.board.groups[0].tiles.map((tile) => tile.id)).toEqual([
      "l1",
      "f1",
      "id-1",
      "id-2",
    ])
    expect(store.board.groups[0].tiles[3]).toMatchObject({
      title: "vite.dev",
      url: "https://vite.dev/guide",
    })
    expect(store.undoEntry).toEqual({ label: "Added 2 links" })
    expect(JSON.parse(storage.value ?? "{}").groups[0].tiles).toHaveLength(4)

    expect(store.undo()).toBe(true)
    expect(store.board.groups[0].tiles.map((tile) => tile.id)).toEqual([
      "l1",
      "f1",
    ])
  })

  test("adds nothing when the batch is invalid or the group is unknown", () => {
    const store = createBoardStore({ storage: memory(seedBoard()), createId: ids() })

    expect(store.addLinks("g1", [])).toBe(0)
    expect(store.addLinks("nope", [{ title: "x", url: "example.com" }])).toBe(0)
    expect(
      store.addLinks("g1", [
        { title: "ok", url: "example.com" },
        { title: "bad", url: "javascript:alert(1)" },
      ]),
    ).toBe(0)
    expect(store.board.groups[0].tiles).toHaveLength(2)
    expect(store.undoEntry).toBeNull()
  })
})
