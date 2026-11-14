import {
  createAgent,
  registerTools,
  type AgentAction,
} from "@ui-sdk/svelte/agent"
import type { BoardStore } from "./board.svelte"
import { registerTilesTools } from "./webmcp"

export interface TilesAgentOptions {
  allow?: (
    step: AgentAction,
    context: { signal: AbortSignal },
  ) => boolean | Promise<boolean>
}

export function createTilesAgent(options: TilesAgentOptions = {}) {
  return createAgent({
    allow:
      options.allow ??
      ((step) => (step.confirm ? window.confirm(step.confirm) : true)),
  })
}

export type TilesAgent = ReturnType<typeof createTilesAgent>

export function installWebMcp(agent: TilesAgent, store: BoardStore) {
  let unregisterAgentTools = () => {}
  try {
    unregisterAgentTools = registerTools(agent, { allow: () => true })
  } catch {
    // The tiles tools can still register when the bridge's tools don't.
  }
  const unregisterTilesTools = registerTilesTools(store)
  return () => {
    unregisterAgentTools()
    unregisterTilesTools()
  }
}
