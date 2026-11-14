import { EXPERIMENTS, type SearchResolution } from "./registry"
import { looksLikeUrl, searchTarget } from "../url"
import { experimentEnabled, type Settings } from "../settings.svelte"

/**
 * A typed address always wins, then the enabled experiments in registry order,
 * then the configured search engine.
 */
export function resolveQuery(
  query: string,
  settings: Settings,
): SearchResolution | null {
  const trimmed = query.trim()
  if (!trimmed) return null

  if (looksLikeUrl(trimmed)) {
    const href = searchTarget(trimmed, settings.searchEngine)
    return href ? { kind: "navigate", href, hint: null } : null
  }

  for (const experiment of EXPERIMENTS) {
    if (!experimentEnabled(settings, experiment.id)) continue
    const hit = experiment.resolveSearch?.(trimmed, { settings })
    if (hit) return hit
  }

  const href = searchTarget(trimmed, settings.searchEngine)
  return href ? { kind: "navigate", href, hint: null } : null
}
