import type {
  Board,
  FolderLink,
  FolderTile,
  Group,
  LinkTile,
  Tile,
} from "./types"
import { normalizeUrl, titleFromUrl } from "./url"

const MAX_GROUPS = 100
const MAX_TILES = 500
const MAX_LINKS = 500
const MAX_TITLE = 120
const MAX_URL = 4096

type Result = { ok: true; board: Board } | { ok: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function text(value: unknown, where: string, max: number): string {
  if (typeof value !== "string") throw new Error(`${where} must be text.`)
  const trimmed = value.trim()
  if (trimmed.length > max) throw new Error(`${where} is too long.`)
  return trimmed
}

function id(value: unknown, where: string, seen: Set<string>): string {
  const parsed = text(value, where, 200)
  if (!parsed) throw new Error(`${where} is missing.`)
  if (seen.has(parsed)) throw new Error(`${where} is duplicated.`)
  seen.add(parsed)
  return parsed
}

function url(value: unknown, where: string): string {
  if (typeof value !== "string") throw new Error(`${where} must be a URL.`)
  if (value.length > MAX_URL) throw new Error(`${where} is too long.`)
  const parsed = normalizeUrl(value)
  if (!parsed) throw new Error(`${where} must be an http or https URL.`)
  return parsed
}

function title(value: unknown, where: string, fallback: string): string {
  if (value === undefined || value === null) return fallback
  const parsed = text(value, where, MAX_TITLE)
  return parsed || fallback
}

function link(value: unknown, where: string, seen: Set<string>): FolderLink {
  if (!isRecord(value)) throw new Error(`${where} must be an object.`)
  const parsedUrl = url(value.url, `${where}.url`)
  return {
    id: id(value.id, `${where}.id`, seen),
    title: title(value.title, `${where}.title`, titleFromUrl(parsedUrl)),
    url: parsedUrl,
  }
}

function tile(value: unknown, where: string, seen: Set<string>): Tile {
  if (!isRecord(value)) throw new Error(`${where} must be an object.`)
  const tileId = id(value.id, `${where}.id`, seen)

  if (value.kind === "link") {
    const parsedUrl = url(value.url, `${where}.url`)
    const link: LinkTile = {
      id: tileId,
      kind: "link",
      title: title(value.title, `${where}.title`, titleFromUrl(parsedUrl)),
      url: parsedUrl,
    }
    return link
  }

  if (value.kind === "folder") {
    if (!Array.isArray(value.links)) {
      throw new Error(`${where}.links must be a list.`)
    }
    if (value.links.length > MAX_LINKS) {
      throw new Error(`${where} has too many links.`)
    }
    const folder: FolderTile = {
      id: tileId,
      kind: "folder",
      title: title(value.title, `${where}.title`, "Folder"),
      links: value.links.map((entry, index) =>
        link(entry, `${where}.links[${index}]`, seen),
      ),
    }
    if (!folder.title) throw new Error(`${where}.title is missing.`)
    return folder
  }

  throw new Error(`${where}.kind must be "link" or "folder".`)
}

function group(value: unknown, where: string, seen: Set<string>): Group {
  if (!isRecord(value)) throw new Error(`${where} must be an object.`)
  if (!Array.isArray(value.tiles)) {
    throw new Error(`${where}.tiles must be a list.`)
  }
  const group: Group = {
    id: id(value.id, `${where}.id`, seen),
    title: text(value.title, `${where}.title`, MAX_TITLE),
    tiles: value.tiles.map((entry, index) =>
      tile(entry, `${where}.tiles[${index}]`, seen),
    ),
  }
  if (!group.title) throw new Error(`${where}.title is missing.`)
  return group
}

export function validateBoard(value: unknown): Result {
  if (!isRecord(value)) return { ok: false, error: "The file is not an object." }
  if (value.version !== 1) {
    return { ok: false, error: "This file was made by a different version." }
  }
  if (!Array.isArray(value.groups)) {
    return { ok: false, error: "The file has no groups." }
  }
  if (value.groups.length > MAX_GROUPS) {
    return { ok: false, error: "The file has too many groups." }
  }

  try {
    const seen = new Set<string>()
    const groups = value.groups.map((entry, index) =>
      group(entry, `groups[${index}]`, seen),
    )
    const tiles = groups.reduce((count, entry) => count + entry.tiles.length, 0)
    if (tiles > MAX_TILES) throw new Error("The file has too many tiles.")
    return { ok: true, board: { version: 1, groups } }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The file is invalid.",
    }
  }
}

export function parseBoard(raw: string): Result {
  try {
    return validateBoard(JSON.parse(raw))
  } catch {
    return { ok: false, error: "The saved data is not valid JSON." }
  }
}

export function createId(): string {
  const random = globalThis.crypto?.randomUUID?.()
  if (random) return random
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createInitialBoard(create: () => string = createId): Board {
  return {
    version: 1,
    groups: [{ id: create(), title: "Pinned", tiles: [] }],
  }
}

export function countTiles(board: Board): number {
  return board.groups.reduce((count, group) => count + group.tiles.length, 0)
}

export function findFolder(
  groups: Group[],
  folderId: string,
): FolderTile | null {
  for (const group of groups) {
    for (const tile of group.tiles) {
      if (tile.id === folderId && tile.kind === "folder") return tile
    }
  }
  return null
}
