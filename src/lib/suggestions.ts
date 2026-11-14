import type { Board } from "./types"
import type { BoardStore } from "./board.svelte"
import { normalizeUrl, titleFromUrl } from "./url"

export interface SuggestionLinkInput {
  title?: string
  url: string
}

export interface SuggestionGroupInput {
  title: string
  links: SuggestionLinkInput[]
}

export interface PlannedLink {
  group: string
  title: string
  url: string
}

export interface PlannedGroup {
  title: string
  existing: boolean
  groupId?: string
  links: PlannedLink[]
}

export interface SuggestionPlan {
  groups: PlannedGroup[]
  duplicates: { url: string; group: string }[]
  invalid: { url: string; reason: string }[]
  summary: { groups: number; links: number }
}

export interface ApplyResult {
  addedGroups: string[]
  addedLinks: PlannedLink[]
  failed: { group: string; url: string; reason: string }[]
}

function clean(value: string, fallback: string): string {
  return value.trim().slice(0, 120) || fallback
}

export function canonical(url: string): string {
  const parsed = new URL(url)
  parsed.hash = ""
  if (parsed.hostname.startsWith("www.")) {
    parsed.hostname = parsed.hostname.slice(4)
  }
  return parsed.href
}

export function collectUrls(board: Board): Set<string> {
  const urls = new Set<string>()
  for (const group of board.groups) {
    for (const tile of group.tiles) {
      if (tile.kind === "link") urls.add(canonical(tile.url))
      else for (const link of tile.links) urls.add(canonical(link.url))
    }
  }
  return urls
}

export function planSuggestions(
  board: Board,
  groups: SuggestionGroupInput[],
): SuggestionPlan {
  const byTitle = new Map(
    board.groups.map((group) => [group.title.toLowerCase(), group]),
  )
  const urls = collectUrls(board)
  const planned = new Map<string, PlannedGroup>()
  const duplicates: { url: string; group: string }[] = []
  const invalid: { url: string; reason: string }[] = []

  for (const suggestion of groups) {
    const requestedTitle = clean(suggestion.title, "Suggested")
    const existing = byTitle.get(requestedTitle.toLowerCase())
    const title = existing?.title ?? requestedTitle
    const key = title.toLowerCase()

    let group = planned.get(key)
    if (!group) {
      group = {
        title,
        existing: Boolean(existing),
        groupId: existing?.id,
        links: [],
      }
      planned.set(key, group)
    }

    for (const link of suggestion.links) {
      const normalized = normalizeUrl(link.url)
      if (!normalized) {
        invalid.push({
          url: link.url,
          reason: "Only http and https URLs can be added.",
        })
        continue
      }

      const url = canonical(normalized)
      if (urls.has(url)) {
        duplicates.push({ url, group: title })
        continue
      }
      urls.add(url)
      group.links.push({
        group: title,
        title: clean(link.title ?? "", titleFromUrl(url)),
        url,
      })
    }
  }

  const plannedGroups = [...planned.values()].filter(
    (group) => group.links.length > 0,
  )

  return {
    groups: plannedGroups,
    duplicates,
    invalid,
    summary: {
      groups: plannedGroups.length,
      links: plannedGroups.reduce((count, group) => count + group.links.length, 0),
    },
  }
}

export function applySuggestionPlan(
  store: BoardStore,
  plan: SuggestionPlan,
):
  | { ok: true; result: ApplyResult }
  | { ok: false; error: string } {
  if (store.loadError) {
    return { ok: false, error: "The saved tiles couldn't be read." }
  }

  const result: ApplyResult = {
    addedGroups: [],
    addedLinks: [],
    failed: [],
  }

  for (const planned of plan.groups) {
    let groupId =
      planned.groupId ??
      store.board.groups.find(
        (group) => group.title.toLowerCase() === planned.title.toLowerCase(),
      )?.id

    if (!groupId) {
      groupId = store.addGroup(planned.title) ?? undefined
      if (!groupId) {
        return { ok: false, error: "Couldn't create a group for the suggestions." }
      }
      result.addedGroups.push(planned.title)
    }

    for (const link of planned.links) {
      const id = store.addLink(groupId, { title: link.title, url: link.url })
      if (!id) {
        result.failed.push({
          group: planned.title,
          url: link.url,
          reason: "Couldn't add the link.",
        })
        continue
      }
      result.addedLinks.push({ ...link, group: planned.title })
    }
  }

  return { ok: true, result }
}
