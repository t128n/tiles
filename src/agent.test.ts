import { render, screen, waitFor } from "@testing-library/svelte"
import { beforeEach, describe, expect, test } from "vitest"
import App from "./App.svelte"
import { createTilesAgent } from "./lib/agent"
import { STORAGE_KEY } from "./lib/board.svelte"
import type { Board } from "./lib/types"

let approve = false
const agent = createTilesAgent({
  allow: (step) => !step.confirm || approve,
})

const seeded: Board = {
  version: 1,
  groups: [
    {
      id: "g1",
      title: "Pinned",
      tiles: [
        {
          id: "l1",
          kind: "link",
          title: "GitHub",
          url: "https://github.com/",
        },
      ],
    },
  ],
}

beforeEach(() => {
  approve = false
  localStorage.clear()
})

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe("agent bridge", () => {
  test("names every control and adds a link through the bridge", async () => {
    render(App)
    await settle()

    const entries = agent
      .snapshot()
      .filter((entry) => !entry.offPage && entry.component !== "more")
    for (const entry of entries) {
      expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy()
    }
    const labels = entries.map((entry) => entry.label)
    for (const label of [
      "Add link to Pinned",
      "Settings",
      "Tiles in Pinned",
      "Actions for Pinned",
    ]) {
      expect(labels, `${label} is missing from the snapshot`).toContain(label)
    }

    const result = await agent.act({
      steps: [
        { ref: "Add link to Pinned", action: "press" },
        { ref: "URL", action: "setValue", args: ["github.com"] },
        { ref: "Title", action: "setValue", args: ["GitHub"] },
        { ref: "Save", action: "press" },
      ],
    })
    expect(result.ok, result.error?.message).toBe(true)

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Open GitHub" })).toBeInTheDocument(),
    )
    expect(localStorage.getItem(STORAGE_KEY)).toContain("GitHub")
  })

  test("refuses a marked delete until a person agrees", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    render(App)
    await settle()

    const remove = {
      steps: [
        {
          ref: "Actions for GitHub",
          action: "press",
          args: ["Delete link…"],
        },
        {
          ref: "Delete “GitHub”?",
          action: "press",
          args: ["Delete GitHub"],
        },
      ],
    }

    expect((await agent.act(remove)).ok).toBe(false)
    expect(screen.getByRole("link", { name: "Open GitHub" })).toBeInTheDocument()

    approve = true
    expect((await agent.act(remove)).ok).toBe(true)
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: "Open GitHub" })).not.toBeInTheDocument(),
    )
  })
})

