import { mount } from "svelte"
import "./app.css"
import App from "./App.svelte"
import { createTilesAgent, installWebMcp } from "./lib/agent"
import { createBoardStore } from "./lib/board.svelte"

const store = createBoardStore()
const agent = createTilesAgent()

const app = mount(App, {
  target: document.getElementById("app")!,
  props: { store },
})

installWebMcp(agent, store)

export { agent }
export default app
