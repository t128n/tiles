import type { BoardStore } from "./board.svelte"
import { downloadText } from "./download"
import type { Board } from "./types"

export function boardFileName(date = new Date()): string {
  return `tiles-${date.toISOString().slice(0, 10)}.json`
}

export function exportBoard(store: BoardStore): void {
  downloadText(boardFileName(), store.exportRaw())
}

function plural(value: number, word: string): string {
  return `${value} ${word}${value === 1 ? "" : "s"}`
}

export function boardSummary(board: Board): string {
  let links = 0
  let folders = 0
  for (const group of board.groups) {
    for (const tile of group.tiles) {
      if (tile.kind === "link") links += 1
      else folders += 1
    }
  }
  return `${plural(board.groups.length, "group")} · ${plural(links, "link")} · ${plural(folders, "folder")}`
}
