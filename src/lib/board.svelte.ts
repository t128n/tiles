import { createId, createInitialBoard, parseBoard } from "./board"
import type { Board, FolderLink, FolderTile, Group, LinkTile, Tile } from "./types"
import { normalizeUrl, titleFromUrl } from "./url"

export const STORAGE_KEY = "tiles:v1"

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface BoardStoreOptions {
  storage?: StorageLike | null
  createId?: () => string
}

export interface NewLink {
  title: string
  url: string
}

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function cleanTitle(value: string, fallback: string): string {
  return value.trim().slice(0, 120) || fallback
}

function groupWithTiles(group: Group, tiles: Tile[]): Group {
  return { ...group, tiles }
}

function replaceGroup(board: Board, groupId: string, tiles: Tile[]): Board {
  return {
    ...board,
    groups: board.groups.map((group) =>
      group.id === groupId ? groupWithTiles(group, tiles) : group,
    ),
  }
}

function ordered<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  const next: T[] = []
  for (const id of ids) {
    const item = byId.get(id)
    if (item && !next.includes(item)) next.push(item)
  }
  for (const item of items) {
    if (!next.includes(item)) next.push(item)
  }
  return next
}

export class BoardStore {
  board = $state.raw<Board>(createInitialBoard())
  loadError = $state<{ raw: string; message: string } | null>(null)
  saveError = $state<string | null>(null)
  storageAvailable = $state(true)
  undoEntry = $state.raw<{ label: string } | null>(null)

  private storage: StorageLike | null
  private nextId: () => string
  private undoBoard: Board | null = null

  constructor(options: BoardStoreOptions = {}) {
    this.storage = options.storage === undefined ? browserStorage() : options.storage
    this.nextId = options.createId ?? createId
    this.load()
  }

  get groupIds(): string[] {
    return this.board.groups.map((group) => group.id)
  }

  private load() {
    if (!this.storage) {
      this.storageAvailable = false
      this.saveError = "This browser is blocking local storage. Changes stay in this tab only."
      this.board = createInitialBoard(this.nextId)
      return
    }

    try {
      const raw = this.storage.getItem(STORAGE_KEY)
      if (raw === null) {
        this.board = createInitialBoard(this.nextId)
        return
      }
      const parsed = parseBoard(raw)
      if (!parsed.ok) {
        this.loadError = { raw, message: parsed.error }
        this.board = createInitialBoard(this.nextId)
        return
      }
      this.board = parsed.board
    } catch {
      this.storageAvailable = false
      this.saveError = "This browser is blocking local storage. Changes stay in this tab only."
      this.board = createInitialBoard(this.nextId)
    }
  }

  private save(next: Board) {
    if (!this.storageAvailable || !this.storage) return
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(next))
      this.saveError = null
    } catch {
      this.saveError = "Changes aren't being saved. Your browser may be out of space."
    }
  }

  private commit(next: Board, keepUndo = false): boolean {
    if (this.loadError) return false
    if (!keepUndo) this.clearUndo()
    this.board = next
    this.save(next)
    return true
  }

  exportRaw(): string {
    return this.loadError?.raw ?? JSON.stringify(this.board, null, 2)
  }

  replaceBoard(next: Board): boolean {
    this.rememberUndo("Imported a backup")
    return this.commit(next, true)
  }

  undo(): boolean {
    if (!this.undoBoard) return false
    const board = this.undoBoard
    this.undoBoard = null
    this.undoEntry = null
    return this.commit(board)
  }

  dismissUndo(): void {
    this.undoBoard = null
    this.undoEntry = null
  }

  private rememberUndo(label: string, board: Board = this.board) {
    this.undoBoard = board
    this.undoEntry = { label }
  }

  private clearUndo() {
    if (!this.undoBoard && !this.undoEntry) return
    this.undoBoard = null
    this.undoEntry = null
  }

  startFresh(): boolean {
    const next = createInitialBoard(this.nextId)
    this.rememberUndo("Reset the board")
    this.loadError = null
    this.board = next
    this.save(next)
    return true
  }

  ensureGroup(): string | null {
    if (this.loadError) return null
    const first = this.board.groups[0]
    if (first) return first.id
    const group: Group = { id: this.nextId(), title: "Pinned", tiles: [] }
    if (!this.commit({ ...this.board, groups: [group] })) return null
    return group.id
  }

  addGroup(title: string): string | null {
    const clean = cleanTitle(title, "New group")
    const group: Group = { id: this.nextId(), title: clean, tiles: [] }
    if (!this.commit({ ...this.board, groups: [...this.board.groups, group] })) {
      return null
    }
    return group.id
  }

  renameGroup(groupId: string, title: string): boolean {
    const clean = cleanTitle(title, "Untitled")
    let changed = false
    const groups = this.board.groups.map((group) => {
      if (group.id !== groupId) return group
      if (group.title === clean) return group
      changed = true
      return { ...group, title: clean }
    })
    return changed ? this.commit({ ...this.board, groups }) : false
  }

  removeGroup(groupId: string): boolean {
    const group = this.board.groups.find((entry) => entry.id === groupId)
    const groups = this.board.groups.filter((entry) => entry.id !== groupId)
    if (groups.length === this.board.groups.length) return false
    this.rememberUndo(`Deleted “${group?.title ?? "group"}”`)
    return this.commit({ ...this.board, groups }, true)
  }

  reorderGroups(ids: string[]): boolean {
    const groups = ordered(this.board.groups, ids)
    if (groups.every((group, index) => group.id === this.board.groups[index]?.id)) {
      return false
    }
    return this.commit({ ...this.board, groups })
  }

  addLink(groupId: string, input: NewLink): string | null {
    const url = normalizeUrl(input.url)
    if (!url) return null
    const group = this.board.groups.find((entry) => entry.id === groupId)
    if (!group) return null

    const link: LinkTile = {
      id: this.nextId(),
      kind: "link",
      title: cleanTitle(input.title, titleFromUrl(url)),
      url,
    }
    const next = replaceGroup(this.board, groupId, [...group.tiles, link])
    return this.commit(next) ? link.id : null
  }

  /**
   * Adds several links to one group in a single commit, so one undo snapshot
   * covers the whole batch. All or nothing: an invalid URL adds nothing.
   */
  addLinks(groupId: string, inputs: NewLink[]): number {
    if (this.loadError || inputs.length === 0) return 0
    const group = this.board.groups.find((entry) => entry.id === groupId)
    if (!group) return 0

    const tiles: LinkTile[] = []
    for (const input of inputs) {
      const url = normalizeUrl(input.url)
      if (!url) return 0
      tiles.push({
        id: this.nextId(),
        kind: "link",
        title: cleanTitle(input.title, titleFromUrl(url)),
        url,
      })
    }

    this.rememberUndo(
      `Added ${tiles.length} ${tiles.length === 1 ? "link" : "links"}`,
    )
    return this.commit(
      replaceGroup(this.board, groupId, [...group.tiles, ...tiles]),
      true,
    )
      ? tiles.length
      : 0
  }

  addFolder(groupId: string, title: string): string | null {
    const group = this.board.groups.find((entry) => entry.id === groupId)
    if (!group) return null
    const folder: FolderTile = {
      id: this.nextId(),
      kind: "folder",
      title: cleanTitle(title, "Folder"),
      links: [],
    }
    const next = replaceGroup(this.board, groupId, [...group.tiles, folder])
    return this.commit(next) ? folder.id : null
  }

  updateTile(
    groupId: string,
    tileId: string,
    update: { title: string; url?: string },
    targetGroupId = groupId,
  ): boolean {
    const source = this.board.groups.find((entry) => entry.id === groupId)
    const target = this.board.groups.find((entry) => entry.id === targetGroupId)
    const tile = source?.tiles.find((entry) => entry.id === tileId)
    if (!source || !target || !tile) return false

    if (tile.kind === "folder") {
      const nextTile: FolderTile = {
        ...tile,
        title: cleanTitle(update.title, "Folder"),
      }
      return this.writeTile(source, target, nextTile)
    }

    const url = normalizeUrl(update.url ?? tile.url)
    if (!url) return false
    const nextTile: LinkTile = {
      ...tile,
      title: cleanTitle(update.title, titleFromUrl(url)),
      url,
    }
    return this.writeTile(source, target, nextTile)
  }

  private writeTile(source: Group, target: Group, tile: Tile): boolean {
    if (source.id === target.id) {
      const tiles = source.tiles.map((entry) => (entry.id === tile.id ? tile : entry))
      return this.commit(replaceGroup(this.board, source.id, tiles))
    }

    const groups = this.board.groups.map((group) => {
      if (group.id === source.id) {
        return groupWithTiles(
          group,
          group.tiles.filter((entry) => entry.id !== tile.id),
        )
      }
      if (group.id === target.id) {
        return groupWithTiles(group, [...group.tiles, tile])
      }
      return group
    })
    return this.commit({ ...this.board, groups })
  }

  removeTile(groupId: string, tileId: string): boolean {
    const group = this.board.groups.find((entry) => entry.id === groupId)
    if (!group) return false
    const tile = group.tiles.find((entry) => entry.id === tileId)
    const tiles = group.tiles.filter((entry) => entry.id !== tileId)
    if (tiles.length === group.tiles.length) return false
    this.rememberUndo(`Deleted “${tile?.title ?? "tile"}”`)
    return this.commit(replaceGroup(this.board, groupId, tiles), true)
  }

  moveTile(groupId: string, tileId: string, targetGroupId: string): boolean {
    if (groupId === targetGroupId) return false
    const source = this.board.groups.find((entry) => entry.id === groupId)
    const target = this.board.groups.find((entry) => entry.id === targetGroupId)
    const tile = source?.tiles.find((entry) => entry.id === tileId)
    if (!source || !target || !tile) return false

    const groups = this.board.groups.map((group) => {
      if (group.id === source.id) {
        return groupWithTiles(
          group,
          group.tiles.filter((entry) => entry.id !== tileId),
        )
      }
      if (group.id === target.id) {
        return groupWithTiles(group, [...group.tiles, tile])
      }
      return group
    })
    return this.commit({ ...this.board, groups })
  }

  reorderTiles(groupId: string, ids: string[]): boolean {
    const group = this.board.groups.find((entry) => entry.id === groupId)
    if (!group) return false
    const tiles = ordered(group.tiles, ids)
    if (tiles.every((tile, index) => tile.id === group.tiles[index]?.id)) {
      return false
    }
    return this.commit(replaceGroup(this.board, groupId, tiles))
  }

  addFolderLink(groupId: string, folderId: string, input: NewLink): string | null {
    const folder = this.findFolder(groupId, folderId)
    if (!folder) return null
    const url = normalizeUrl(input.url)
    if (!url) return null

    const link: FolderLink = {
      id: this.nextId(),
      title: cleanTitle(input.title, titleFromUrl(url)),
      url,
    }
    return this.updateFolderLinks(folderId, [...folder.links, link]) ? link.id : null
  }

  updateFolderLink(
    folderId: string,
    linkId: string,
    input: { title: string; url: string },
  ): boolean {
    const folder = this.findFolderById(folderId)
    const link = folder?.links.find((entry) => entry.id === linkId)
    if (!folder || !link) return false
    const url = normalizeUrl(input.url)
    if (!url) return false
    const next: FolderLink = {
      ...link,
      title: cleanTitle(input.title, titleFromUrl(url)),
      url,
    }
    return this.updateFolderLinks(
      folderId,
      folder.links.map((entry) => (entry.id === linkId ? next : entry)),
    )
  }

  removeFolderLink(folderId: string, linkId: string): boolean {
    const folder = this.findFolderById(folderId)
    if (!folder) return false
    const link = folder.links.find((entry) => entry.id === linkId)
    const links = folder.links.filter((entry) => entry.id !== linkId)
    if (links.length === folder.links.length) return false
    this.rememberUndo(`Deleted “${link?.title ?? "link"}”`)
    return this.updateFolderLinks(folderId, links, true)
  }

  reorderFolderLinks(folderId: string, ids: string[]): boolean {
    const folder = this.findFolderById(folderId)
    if (!folder) return false
    const links = ordered(folder.links, ids)
    if (links.every((link, index) => link.id === folder.links[index]?.id)) {
      return false
    }
    return this.updateFolderLinks(folderId, links)
  }

  private updateFolderLinks(
    folderId: string,
    links: FolderLink[],
    keepUndo = false,
  ): boolean {
    let found = false
    const groups = this.board.groups.map((group) => {
      let changed = false
      const tiles = group.tiles.map((tile) => {
        if (tile.id !== folderId || tile.kind !== "folder") return tile
        found = true
        changed = true
        return { ...tile, links }
      })
      return changed ? groupWithTiles(group, tiles) : group
    })
    return found ? this.commit({ ...this.board, groups }, keepUndo) : false
  }

  private findFolder(groupId: string, folderId: string): FolderTile | null {
    const tile = this.board.groups
      .find((group) => group.id === groupId)
      ?.tiles.find((entry) => entry.id === folderId)
    return tile?.kind === "folder" ? tile : null
  }

  private findFolderById(folderId: string): FolderTile | null {
    for (const group of this.board.groups) {
      for (const tile of group.tiles) {
        if (tile.id === folderId && tile.kind === "folder") return tile
      }
    }
    return null
  }
}

export function createBoardStore(options: BoardStoreOptions = {}): BoardStore {
  return new BoardStore(options)
}
