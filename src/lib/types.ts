export interface FolderLink {
  id: string
  title: string
  url: string
}

export interface LinkTile {
  id: string
  kind: "link"
  title: string
  url: string
}

export interface FolderTile {
  id: string
  kind: "folder"
  title: string
  links: FolderLink[]
}

export type Tile = LinkTile | FolderTile

export interface Group {
  id: string
  title: string
  tiles: Tile[]
}

export interface Board {
  version: 1
  groups: Group[]
}

export type TileKind = Tile["kind"]

export interface TilePayload {
  kind: TileKind
  groupId: string
  folderId?: string
  tileId?: string
}

export interface GroupPayload {
  groupId?: string
}

export interface ConfirmPayload {
  title: string
  description: string
  confirmLabel: string
  agentConfirm: string
  onConfirm: () => void
}

export interface BulkAddPayload {
  seed?: string
  groupId?: string
}
