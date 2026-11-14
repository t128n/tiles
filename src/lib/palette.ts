import type { Board } from "./types"
import { hostnameOf } from "./url"

export interface PaletteLink {
  id: string
  title: string
  url: string
  host: string
  group: string
  folder?: string
}

/**
 * Every openable link on the board, including the links inside folders, in
 * board order. The palette searches this list instead of filtering the page.
 */
export function collectLinks(board: Board): PaletteLink[] {
  const links: PaletteLink[] = []
  for (const group of board.groups) {
    for (const tile of group.tiles) {
      if (tile.kind === "link") {
        links.push({
          id: tile.id,
          title: tile.title,
          url: tile.url,
          host: hostnameOf(tile.url),
          group: group.title,
        })
        continue
      }
      for (const link of tile.links) {
        links.push({
          id: link.id,
          title: link.title,
          url: link.url,
          host: hostnameOf(link.url),
          group: group.title,
          folder: tile.title,
        })
      }
    }
  }
  return links
}
