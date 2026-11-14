import { experimentEnabled, type Settings } from "../settings.svelte"
import type { ExperimentId } from "./ids"
import { calculator } from "./calculator"

export type SearchResolution =
  | { kind: "navigate"; href: string; hint: string | null }
  | { kind: "copy"; value: string; hint: string }

export interface SearchContext {
  settings: Settings
}

/**
 * One switchable feature. It declares what the settings pane shows and may
 * implement the search capability the overlay hosts.
 */
export interface ExperimentDefinition {
  id: ExperimentId
  title: string
  description: string
  /** Extra words the settings search should match. */
  terms: string[]
  /** The experiment renders in the sidebar. */
  column?: boolean
  resolveSearch?: (
    query: string,
    context: SearchContext,
  ) => SearchResolution | null
}

const hn: ExperimentDefinition = {
  id: "hn",
  title: "Hacker News",
  description:
    "A front page column next to the tiles, read from the public Algolia HN API.",
  terms: ["hacker news", "news", "front page", "column"],
  column: true,
}

const pasteLinks: ExperimentDefinition = {
  id: "paste-links",
  title: "Paste links",
  description:
    "Add several links at once by pasting a list of URLs into Add link.",
  terms: ["paste", "bulk", "multiple", "clipboard", "links"],
}

const github: ExperimentDefinition = {
  id: "github",
  title: "GitHub tracker",
  description:
    "Recent releases and new repositories for users and organisations you follow.",
  terms: ["github", "releases", "repositories", "orgs", "owners", "column"],
  column: true,
}

/** Registry order is also the order search experiments are tried. */
export const EXPERIMENTS: ExperimentDefinition[] = [
  hn,
  calculator,
  pasteLinks,
  github,
]

/** Enabled experiments that render in the sidebar, in registry order. */
export function activeColumns(settings: Settings): ExperimentDefinition[] {
  return EXPERIMENTS.filter(
    (experiment) => experiment.column && experimentEnabled(settings, experiment.id),
  )
}
