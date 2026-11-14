export const localVersion = {
  version: __TILES_VERSION__,
  buildId: __TILES_BUILD__,
}

export interface RemoteVersion {
  version: string
  buildId: string
  builtAt?: string
}

export interface UpdateStatus {
  local: typeof localVersion
  remote: RemoteVersion | null
  updateAvailable: boolean
  error: string | null
}

export async function fetchRemoteVersion(): Promise<RemoteVersion | null> {
  const response = await fetch(
    `${import.meta.env.BASE_URL}version.json?t=${Date.now()}`,
    { cache: "no-store" },
  )
  if (!response.ok) {
    throw new Error(`Version check returned ${response.status}.`)
  }
  const value: unknown = await response.json()
  if (
    !value ||
    typeof value !== "object" ||
    typeof (value as RemoteVersion).version !== "string" ||
    typeof (value as RemoteVersion).buildId !== "string"
  ) {
    throw new Error("The remote version file is invalid.")
  }
  return value as RemoteVersion
}

export async function checkForUpdate(): Promise<UpdateStatus> {
  try {
    const remote = await fetchRemoteVersion()
    return {
      local: localVersion,
      remote,
      updateAvailable: Boolean(remote && remote.buildId !== localVersion.buildId),
      error: null,
    }
  } catch (error) {
    return {
      local: localVersion,
      remote: null,
      updateAvailable: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
