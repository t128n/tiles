import { canonical } from "../suggestions"
import { looksLikeUrl, normalizeUrl, titleFromUrl } from "../url"

/** More candidates than this in one paste is treated as a mistake. */
export const PASTE_LIMIT = 50

export interface ParsedPaste {
  links: { title: string; url: string }[]
  duplicates: number
  invalid: number
  overflow: number
}

function split(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

/**
 * Turns pasted text into links. Words that are not addresses are ignored,
 * addresses that cannot be normalized count as invalid, and anything past the
 * cap is reported as overflow instead of being parsed.
 */
export function parseUrlList(text: string, existing: Set<string>): ParsedPaste {
  const tokens = split(text)
  const candidates: string[] = []
  let invalid = 0
  let overflow = 0

  for (const token of tokens) {
    if (!looksLikeUrl(token)) continue
    if (candidates.length === PASTE_LIMIT) {
      overflow += 1
      continue
    }
    const url = normalizeUrl(token)
    if (!url) {
      invalid += 1
      continue
    }
    candidates.push(url)
  }

  const seen = new Set(existing)
  const links: { title: string; url: string }[] = []
  let duplicates = 0

  for (const url of candidates) {
    const key = canonical(url)
    if (seen.has(key)) {
      duplicates += 1
      continue
    }
    seen.add(key)
    links.push({ title: titleFromUrl(url), url })
  }

  return { links, duplicates, invalid, overflow }
}

/** True when the text carries at least two real URLs. */
export function hasMultipleUrls(text: string): boolean {
  let found = 0
  for (const token of split(text)) {
    if (looksLikeUrl(token) && normalizeUrl(token)) found += 1
    if (found >= 2) return true
  }
  return false
}
