import { getContext, setContext } from "svelte"
import type { BoardStore } from "./board.svelte"
import type { SettingsStore } from "./settings.svelte"
import type { ConfirmPayload, GroupPayload, TilePayload } from "./types"

const BOARD_KEY = Symbol("tiles:board")
const ACTIONS_KEY = Symbol("tiles:actions")
const SETTINGS_KEY = Symbol("tiles:settings")

export interface SettingsRequest {
  section: string | null
}

export interface AppActions {
  openTile: (payload: TilePayload) => void
  openGroup: (payload: GroupPayload) => void
  openSettings: (section?: string) => void
  exportBoard: () => void
  openHelp: () => void
  openBulkAdd: (seed?: string, groupId?: string) => void
  confirm: (payload: ConfirmPayload) => void
  ensureGroup: () => string | null
}

export function setBoardStore(store: BoardStore) {
  setContext(BOARD_KEY, store)
}

export function getBoardStore(): BoardStore {
  const store = getContext<BoardStore | undefined>(BOARD_KEY)
  if (!store) throw new Error("The tiles board store is missing.")
  return store
}

export function setAppActions(actions: AppActions) {
  setContext(ACTIONS_KEY, actions)
}

export function getAppActions(): AppActions {
  const actions = getContext<AppActions | undefined>(ACTIONS_KEY)
  if (!actions) throw new Error("The tiles actions are missing.")
  return actions
}

export function setSettingsStore(store: SettingsStore) {
  setContext(SETTINGS_KEY, store)
}

export function getSettingsStore(): SettingsStore {
  const store = getContext<SettingsStore | undefined>(SETTINGS_KEY)
  if (!store) throw new Error("The tiles settings store is missing.")
  return store
}
