import { EXPERIMENT_IDS, type ExperimentId } from "./experiments/ids"
import { SEARCH_ENGINES, type SearchEngine } from "./url"

export const SETTINGS_KEY = "tiles:settings:v1"

export type Theme = "system" | "light" | "dark"

export const GITHUB_OWNER_LIMIT = 10
export const DEFAULT_GITHUB_OWNERS = ["vercel-labs", "anomalyco"]

const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/

/** Keeps the first ten valid, de-duplicated owners of an untrusted list. */
export function readOwners(value: unknown): string[] {
  if (value === undefined) return [...DEFAULT_GITHUB_OWNERS]
  if (!Array.isArray(value)) return [...DEFAULT_GITHUB_OWNERS]
  const owners: string[] = []
  for (const entry of value) {
    if (typeof entry !== "string") continue
    const owner = entry.trim()
    if (!OWNER_PATTERN.test(owner)) continue
    if (owners.some((known) => known.toLowerCase() === owner.toLowerCase())) {
      continue
    }
    owners.push(owner)
    if (owners.length === GITHUB_OWNER_LIMIT) break
  }
  return owners
}

/** Parses what the settings field holds: owners separated by commas or spaces. */
export function parseOwnerInput(text: string): string[] {
  return readOwners(
    text
      .split(/[\s,]+/)
      .map((owner) => owner.trim())
      .filter(Boolean),
  )
}

export interface Settings {
  searchEngine: SearchEngine
  theme: Theme
  openLinksInNewTab: boolean
  experiments: Partial<Record<ExperimentId, boolean>>
  /** GitHub users or organisations the tracker follows. */
  githubOwners: string[]
}

export const DEFAULT_SETTINGS: Settings = {
  searchEngine: "duckduckgo",
  theme: "system",
  openLinksInNewTab: false,
  experiments: {},
  githubOwners: [...DEFAULT_GITHUB_OWNERS],
}

function defaults(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    experiments: {},
    githubOwners: [...DEFAULT_GITHUB_OWNERS],
  }
}

const THEMES: Theme[] = ["system", "light", "dark"]
const ENGINES = new Set(SEARCH_ENGINES.map((engine) => engine.value))

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface SettingsStoreOptions {
  storage?: StorageLike | null
}

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

type StoredSettings = Partial<Settings> & {
  experimentalHn?: unknown
  experimentalRss?: unknown
}

function readExperiments(
  candidate: StoredSettings,
): Partial<Record<ExperimentId, boolean>> {
  const experiments: Partial<Record<ExperimentId, boolean>> = {}
  if (candidate.experiments && typeof candidate.experiments === "object") {
    const stored = candidate.experiments as Record<string, unknown>
    for (const id of EXPERIMENT_IDS) {
      const value = stored[id]
      if (typeof value === "boolean") experiments[id] = value
    }
  }
  // The panel was an RSS reader, then one boolean, before it was an experiment.
  if (experiments.hn === undefined) {
    if (typeof candidate.experimentalHn === "boolean") {
      experiments.hn = candidate.experimentalHn
    } else if (candidate.experimentalRss === true) {
      experiments.hn = true
    }
  }
  return experiments
}

function read(value: unknown): Settings {
  if (!value || typeof value !== "object") return defaults()
  const candidate = value as StoredSettings
  return {
    searchEngine: ENGINES.has(candidate.searchEngine as SearchEngine)
      ? (candidate.searchEngine as SearchEngine)
      : DEFAULT_SETTINGS.searchEngine,
    theme: THEMES.includes(candidate.theme as Theme)
      ? (candidate.theme as Theme)
      : DEFAULT_SETTINGS.theme,
    openLinksInNewTab:
      typeof candidate.openLinksInNewTab === "boolean"
        ? candidate.openLinksInNewTab
        : DEFAULT_SETTINGS.openLinksInNewTab,
    experiments: readExperiments(candidate),
    githubOwners: readOwners(candidate.githubOwners),
  }
}

export function experimentEnabled(
  settings: Settings,
  id: ExperimentId,
): boolean {
  return settings.experiments[id] === true
}

export class SettingsStore {
  value = $state.raw<Settings>(defaults())

  private storage: StorageLike | null

  constructor(options: SettingsStoreOptions = {}) {
    this.storage =
      options.storage === undefined ? browserStorage() : options.storage
    this.value = this.load()
    this.applyTheme()
  }

  private load(): Settings {
    if (!this.storage) return defaults()
    try {
      const raw = this.storage.getItem(SETTINGS_KEY)
      return raw ? read(JSON.parse(raw)) : defaults()
    } catch {
      return defaults()
    }
  }

  update(patch: Partial<Settings>): void {
    this.value = read({ ...this.value, ...patch })
    this.applyTheme()
    if (!this.storage) return
    try {
      this.storage.setItem(SETTINGS_KEY, JSON.stringify(this.value))
    } catch {
      // Settings stay in memory when storage is unavailable.
    }
  }

  reset(): void {
    this.update(DEFAULT_SETTINGS)
  }

  applyTheme(): void {
    if (typeof document === "undefined") return
    if (this.value.theme === "system") {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = this.value.theme
    }
  }
}

export function createSettingsStore(
  options: SettingsStoreOptions = {},
): SettingsStore {
  return new SettingsStore(options)
}
