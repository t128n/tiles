import { localVersion } from "./version"

const UPDATE_KEY = "tiles:update-from:v1"

function session(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/**
 * Remembers the build that asked for an update, so the page after the reload
 * can tell whether the update changed anything.
 */
export function markUpdateRequested(): void {
  session()?.setItem(UPDATE_KEY, localVersion.buildId)
}

export interface UpdateResult {
  previousBuildId: string
  /** False when the reload came back on the same build. */
  updated: boolean
}

/** Reads and clears the marker left by the page before the update. */
export function consumeUpdateRequest(): UpdateResult | null {
  const store = session()
  if (!store) return null
  const previousBuildId = store.getItem(UPDATE_KEY)
  if (previousBuildId === null) return null
  store.removeItem(UPDATE_KEY)
  return {
    previousBuildId,
    updated: previousBuildId !== localVersion.buildId,
  }
}
