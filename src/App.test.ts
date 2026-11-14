import { fireEvent, render, screen, waitFor, within } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import App from "./App.svelte"
import { STORAGE_KEY } from "./lib/board.svelte"
import type { Board } from "./lib/types"

function seed(board: Board) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
}

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
        {
          id: "l2",
          kind: "link",
          title: "MDN",
          url: "https://developer.mozilla.org/",
        },
      ],
    },
    {
      id: "g2",
      title: "Work",
      tiles: [
        {
          id: "l3",
          kind: "link",
          title: "Linear",
          url: "https://linear.app/",
        },
      ],
    },
  ],
}

beforeEach(() => {
  localStorage.clear()
})

describe("tiles app", () => {
  test("adds a link with the dialog and saves it", async () => {
    const user = userEvent.setup()
    render(App)

    await user.click(screen.getByRole("button", { name: "Add link to Pinned" }))
    expect(await screen.findByRole("dialog", { name: "New link" })).toBeTruthy()

    await user.type(screen.getByLabelText("URL"), "github.com")
    await user.type(screen.getByLabelText("Title"), "GitHub")
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "New link" })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole("link", { name: "Open GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/",
    )
    expect(localStorage.getItem(STORAGE_KEY)).toContain("GitHub")
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Add link to Pinned" }),
      ),
    )
  })

  test("creates a folder and adds a link inside it", async () => {
    const user = userEvent.setup()
    render(App)

    await user.click(screen.getByRole("button", { name: "Actions for Pinned" }))
    await user.click(await screen.findByRole("menuitem", { name: "Add folder" }))
    await user.type(await screen.findByLabelText("Folder name"), "Dev")
    await user.click(screen.getByRole("button", { name: "Save" }))

    const folder = await screen.findByRole("button", {
      name: "Open folder Dev",
    })
    await user.click(folder)

    const popoverCandidate = await screen.findByRole("dialog", { name: "Dev" })
    const inside = within(popoverCandidate)
    await user.click(inside.getByRole("button", { name: "Add link" }))

    await user.type(await screen.findByLabelText("URL"), "developer.mozilla.org")
    await user.type(screen.getByLabelText("Title"), "MDN")
    await user.click(screen.getByRole("button", { name: "Save" }))

    let popover = screen.queryByRole("dialog", { name: "Dev" })
    if (!popover) {
      await user.click(folder)
      popover = await screen.findByRole("dialog", { name: "Dev" })
    }

    expect(
      await within(popover).findByRole("link", { name: "Open link MDN" }),
    ).toHaveAttribute("href", "https://developer.mozilla.org/")
    expect(localStorage.getItem(STORAGE_KEY)).toContain("MDN")
  })

  test("keeps the dialog open when the URL is invalid", async () => {
    const user = userEvent.setup()
    render(App)

    await user.click(screen.getByRole("button", { name: "Add link to Pinned" }))
    await user.type(await screen.findByLabelText("URL"), "not a url")
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Enter an address like example.com.")).toBeInTheDocument()
    expect(screen.getByRole("dialog", { name: "New link" })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  test("opens the command palette and runs a command", async () => {
    seed(seeded)
    const user = userEvent.setup()
    render(App)

    await user.click(screen.getByRole("button", { name: "Open command palette" }))
    const palette = await screen.findByRole("dialog", {
      name: "Search and commands",
    })
    expect(within(palette).getByText("Add link")).toBeInTheDocument()

    await user.click(within(palette).getByText("Add link"))
    expect(await screen.findByRole("dialog", { name: "New link" })).toBeInTheDocument()
  })

  test("opens the data settings from the command palette", async () => {
    seed(seeded)
    const user = userEvent.setup()
    render(App)

    await user.click(screen.getByRole("button", { name: "Open command palette" }))
    const palette = await screen.findByRole("dialog", {
      name: "Search and commands",
    })
    expect(within(palette).getByText("Export board")).toBeInTheDocument()

    await user.click(within(palette).getByText("Import board"))
    const settings = await screen.findByRole("dialog", { name: "Settings" })
    expect(
      within(settings).getByRole("heading", { name: "Data" }),
    ).toBeInTheDocument()
    expect(
      within(settings).getByRole("button", { name: /Choose file/ }),
    ).toBeInTheDocument()
  })

  test("typing outside a field opens the palette with that character", async () => {
    seed(seeded)
    render(App)

    fireEvent.keyDown(document.body, { key: "g" })
    const palette = await screen.findByRole("dialog", {
      name: "Search and commands",
    })
    const input = within(palette).getByLabelText(
      "Search tiles, the web, or run a command",
    )
    await waitFor(() => expect(input).toHaveValue("g"))
    await waitFor(() => expect(document.activeElement).toBe(input))
  })

  test("Ctrl+F opens the palette instead of native find", async () => {
    seed(seeded)
    render(App)

    fireEvent.keyDown(document.body, { key: "f", ctrlKey: true })
    const palette = await screen.findByRole("dialog", {
      name: "Search and commands",
    })
    expect(
      within(palette).getByLabelText("Search tiles, the web, or run a command"),
    ).toHaveValue("")
  })

  test("opens settings with Ctrl+,", async () => {
    render(App)

    fireEvent.keyDown(document.body, { key: ",", ctrlKey: true })
    expect(await screen.findByRole("dialog", { name: "Settings" })).toBeInTheDocument()
  })

  test("opens help with Ctrl+? and shows the browser setup", async () => {
    const user = userEvent.setup()
    render(App)

    fireEvent.keyDown(document.body, { key: "?", ctrlKey: true, shiftKey: true })
    const help = await screen.findByRole("dialog", { name: "Help" })
    expect(
      within(help).getByRole("heading", { name: "Getting started" }),
    ).toBeInTheDocument()

    await user.click(within(help).getByRole("button", { name: "Browser setup" }))
    expect(
      within(help).getByRole("heading", { name: "Browser setup" }),
    ).toBeInTheDocument()
    expect(within(help).getByRole("table")).toHaveTextContent("Helium")
  })

  test("offers the prompts from help", async () => {
    const user = userEvent.setup()
    render(App)

    fireEvent.keyDown(document.body, { key: "?", ctrlKey: true, shiftKey: true })
    const help = await screen.findByRole("dialog", { name: "Help" })
    await user.click(
      within(help).getByRole("button", { name: "Agent prompts" }),
    )

    expect(within(help).getByText("Suggest tiles")).toBeInTheDocument()
    expect(within(help).getAllByRole("button", { name: "Copy" })).toHaveLength(1)
  })

  test("opens help with Alt+?", async () => {
    render(App)

    fireEvent.keyDown(document.body, { key: "?", altKey: true, shiftKey: true })
    expect(await screen.findByRole("dialog", { name: "Help" })).toBeInTheDocument()
  })

  test("restores the last side panel tab and remembers a switch", async () => {
    localStorage.setItem(
      "tiles:settings:v1",
      JSON.stringify({
        experiments: { hn: true, github: true },
        sidebarTab: "github",
      }),
    )
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ hits: [] }) })),
    )
    const user = userEvent.setup()
    render(App)

    const githubTab = await screen.findByRole("tab", { name: "GitHub tracker" })
    await waitFor(() => expect(githubTab).toHaveAttribute("aria-selected", "true"))

    await user.click(screen.getByRole("tab", { name: "Hacker News" }))
    expect(
      JSON.parse(localStorage.getItem("tiles:settings:v1") ?? "{}").sidebarTab,
    ).toBe("hn")
  })

  test("reopens settings after an update and confirms it", async () => {
    sessionStorage.setItem("tiles:update-from:v1", "an-older-build")
    render(App)

    const settings = await screen.findByRole("dialog", { name: "Settings" })
    expect(
      within(settings).getByRole("heading", { name: "About" }),
    ).toBeInTheDocument()
    expect(within(settings).getByRole("status")).toHaveTextContent(
      /Updated to v1\.0\.1/,
    )
  })

  test("opens help from the command palette", async () => {
    const user = userEvent.setup()
    render(App)

    await user.click(screen.getByRole("button", { name: "Open command palette" }))
    const palette = await screen.findByRole("dialog", {
      name: "Search and commands",
    })
    await user.click(within(palette).getByText("Help"))

    expect(await screen.findByRole("dialog", { name: "Help" })).toBeInTheDocument()
  })

  test("shows the experimental Hacker News panel when enabled", async () => {
    localStorage.setItem(
      "tiles:settings:v1",
      JSON.stringify({ experimentalHn: true }),
    )
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          hits: [
            {
              objectID: "1",
              title: "A front page story",
              url: "https://example.com/story",
              points: 42,
              num_comments: 7,
              author: "pg",
            },
          ],
        }),
      })),
    )
    render(App)

    expect(
      screen.getByRole("heading", { name: "Hacker News" }),
    ).toBeInTheDocument()
    expect(await screen.findByText("A front page story")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "7 comments" }),
    ).toHaveAttribute("href", "https://news.ycombinator.com/item?id=1")
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "SPAN" &&
          (element.textContent ?? "")
            .replace(/\s+/g, " ")
            .trim()
            .startsWith("42 points · 7 comments"),
      ),
    ).toBeInTheDocument()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test("lists every experiment and persists a toggle", async () => {
    const user = userEvent.setup()
    render(App)

    fireEvent.keyDown(document.body, { key: ",", ctrlKey: true })
    const settings = await screen.findByRole("dialog", { name: "Settings" })
    await user.click(
      within(settings).getByRole("button", { name: "Experimental" }),
    )

    expect(within(settings).getByText("Hacker News")).toBeInTheDocument()
    expect(within(settings).getByText("Calculator")).toBeInTheDocument()
    expect(within(settings).getByText("Paste links")).toBeInTheDocument()
    expect(within(settings).getByText("GitHub tracker")).toBeInTheDocument()

    await user.click(within(settings).getByRole("switch", { name: "Calculator" }))
    const stored = JSON.parse(
      localStorage.getItem("tiles:settings:v1") ?? "{}",
    )
    expect(stored.experiments.calculator).toBe(true)
  })

  test("evaluates an expression in the palette and copies it", async () => {
    localStorage.setItem(
      "tiles:settings:v1",
      JSON.stringify({ experiments: { calculator: true } }),
    )
    const user = userEvent.setup()
    const writeText = vi
      .spyOn(window.navigator.clipboard, "writeText")
      .mockResolvedValue(undefined)
    render(App)

    fireEvent.keyDown(document.body, { key: "/" })
    const palette = await screen.findByRole("dialog", {
      name: "Search and commands",
    })
    const search = within(palette).getByLabelText(
      "Search tiles, the web, or run a command",
    )
    await user.type(search, "18*3")

    const action = within(palette).getByRole("option", { name: /Copy 54/ })
    expect(action).toBeVisible()
    expect(within(palette).getByText("= 54 · Enter to copy")).toBeVisible()

    await user.click(action)
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Search and commands" }),
      ).not.toBeInTheDocument(),
    )
    expect(writeText).toHaveBeenCalledWith("54")
  })

  test("bulk adds pasted links in one undoable step", async () => {
    seed(seeded)
    localStorage.setItem(
      "tiles:settings:v1",
      JSON.stringify({ experiments: { "paste-links": true } }),
    )
    const user = userEvent.setup()
    render(App)

    await user.click(screen.getByRole("button", { name: "Open command palette" }))
    const palette = await screen.findByRole("dialog", {
      name: "Search and commands",
    })
    await user.click(within(palette).getByText("Add links…"))

    const dialog = await screen.findByRole("dialog", { name: "Add links" })
    expect(within(dialog).getByLabelText("URLs")).toHaveValue("")

    await user.type(
      within(dialog).getByLabelText("URLs"),
      "a.example b.example c.example",
    )
    expect(within(dialog).getByText("3 links")).toBeInTheDocument()

    await user.click(within(dialog).getByRole("button", { name: "Add 3 links" }))
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Add links" })).not.toBeInTheDocument(),
    )

    expect(screen.getByRole("link", { name: "Open a.example" })).toHaveAttribute(
      "href",
      "https://a.example/",
    )
    expect(screen.getByText("Added 3 links")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Undo" }))
    await waitFor(() =>
      expect(
        screen.queryByRole("link", { name: "Open a.example" }),
      ).not.toBeInTheDocument(),
    )
  })

  test("offers Add links only while the experiment is enabled", async () => {
    seed(seeded)
    const user = userEvent.setup()
    render(App)

    await user.click(screen.getByRole("button", { name: "Open command palette" }))
    const palette = await screen.findByRole("dialog", {
      name: "Search and commands",
    })
    expect(within(palette).queryByText("Add links…")).not.toBeInTheDocument()
  })

  test("turns a multi-URL paste in Add link into the bulk dialog", async () => {
    seed(seeded)
    localStorage.setItem(
      "tiles:settings:v1",
      JSON.stringify({ experiments: { "paste-links": true } }),
    )
    const user = userEvent.setup()
    render(App)

    await user.click(screen.getByRole("button", { name: "Add link to Pinned" }))
    const url = await screen.findByLabelText("URL")
    await user.click(url)
    await user.paste("a.example b.example")

    const dialog = await screen.findByRole("dialog", { name: "Add links" })
    expect(within(dialog).getByLabelText("URLs")).toHaveValue(
      "a.example b.example",
    )
    expect(within(dialog).getByText("2 links")).toBeInTheDocument()

    await user.click(within(dialog).getByRole("button", { name: "Add 2 links" }))
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Add links" }),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByRole("link", { name: "Open a.example" })).toHaveAttribute(
      "href",
      "https://a.example/",
    )
    expect(screen.getByText("Added 2 links")).toBeInTheDocument()
  })

  test("leaves a multi-URL paste inside a folder dialog alone", async () => {
    seed(seeded)
    localStorage.setItem(
      "tiles:settings:v1",
      JSON.stringify({ experiments: { "paste-links": true } }),
    )
    const user = userEvent.setup()
    render(App)

    await user.click(screen.getByRole("button", { name: "Actions for Pinned" }))
    await user.click(await screen.findByRole("menuitem", { name: "Add folder" }))
    await user.type(await screen.findByLabelText("Folder name"), "Dev")
    await user.click(screen.getByRole("button", { name: "Save" }))

    const folder = await screen.findByRole("button", { name: "Open folder Dev" })
    await user.click(folder)
    const popover = await screen.findByRole("dialog", { name: "Dev" })
    await user.click(within(popover).getByRole("button", { name: "Add link" }))

    const url = await screen.findByLabelText("URL")
    await user.click(url)
    await user.paste("a.example b.example")

    expect(
      screen.queryByRole("dialog", { name: "Add links" }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText("URL")).toHaveValue("a.example b.example")
  })

  test("keeps GitHub owners from the settings field", async () => {
    const user = userEvent.setup()
    render(App)

    fireEvent.keyDown(document.body, { key: ",", ctrlKey: true })
    const settings = await screen.findByRole("dialog", { name: "Settings" })
    await user.click(
      within(settings).getByRole("button", { name: "Experimental" }),
    )
    await user.click(
      within(settings).getByRole("switch", { name: "GitHub tracker" }),
    )

    const owners = await within(settings).findByLabelText("GitHub owners")
    await user.clear(owners)
    await user.type(owners, "acme, new-org")
    await user.tab()

    const stored = JSON.parse(localStorage.getItem("tiles:settings:v1") ?? "{}")
    expect(stored.githubOwners).toEqual(["acme", "new-org"])
  })

  test("tabs the sidebars when two columns are enabled", async () => {
    localStorage.setItem(
      "tiles:settings:v1",
      JSON.stringify({
        experiments: { hn: true, github: true },
        githubOwners: ["acme"],
      }),
    )
    const githubFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("hn.algolia.com")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            hits: [
              {
                objectID: "1",
                title: "A front page story",
                url: "https://example.com/story",
                points: 42,
                num_comments: 7,
                author: "pg",
              },
            ],
          }),
        }
      }
      if (url.includes("/releases")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            releases: [
              {
                tag: "v2.0.0",
                name: "Lib 2.0",
                publishedAt: "2026-11-14T10:00:00Z",
              },
            ],
          }),
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          repos: [
            {
              repo: "acme/lib",
              createdAt: "2020-01-01T00:00:00Z",
              pushedAt: "2026-11-14T10:00:00Z",
            },
          ],
        }),
      }
    })
    vi.stubGlobal("fetch", githubFetch)
    const user = userEvent.setup()
    render(App)

    expect(screen.getByRole("tab", { name: "Hacker News" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /GitHub/ })).toBeInTheDocument()
    expect(await screen.findByText("A front page story")).toBeInTheDocument()

    await user.click(screen.getByRole("tab", { name: /GitHub/ }))
    expect(await screen.findByText(/Lib 2.0/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /acme\/lib/ })).toHaveAttribute(
      "href",
      "https://github.com/acme/lib/releases/tag/v2.0.0",
    )

    const calls = () =>
      githubFetch.mock.calls.filter(([input]) =>
        String(input).includes("ungh.cc"),
      ).length
    const before = calls()
    await user.click(screen.getByRole("tab", { name: "Hacker News" }))
    await user.click(screen.getByRole("tab", { name: /GitHub/ }))
    expect(calls()).toBe(before)
  })

  test("shows a GitHub failure instead of an empty panel", async () => {
    localStorage.setItem(
      "tiles:settings:v1",
      JSON.stringify({
        experiments: { github: true },
        githubOwners: ["ghost"],
      }),
    )
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 404,
        headers: { get: () => null },
        json: async () => ({}),
      })),
    )
    render(App)

    expect(
      await screen.findByText("Unknown GitHub owner “ghost”."),
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "GitHub" })).toBeInTheDocument()
    expect(screen.queryByText("Nothing recent.")).not.toBeInTheDocument()
  })

  test("recovers from unreadable saved data without overwriting it", async () => {
    localStorage.setItem(STORAGE_KEY, "{broken")
    const user = userEvent.setup()
    render(App)

    expect(
      screen.getByRole("heading", { name: "Couldn’t read your saved tiles" }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Add link to Pinned" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Start fresh" }))
    expect(screen.getByRole("heading", { name: "Pinned" })).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).not.toBe("{broken")
  })

  test("shows results without filtering the board", async () => {
    seed(seeded)
    const user = userEvent.setup()
    render(App)

    await user.click(screen.getByRole("button", { name: "Open command palette" }))
    const palette = await screen.findByRole("dialog", {
      name: "Search and commands",
    })
    const input = within(palette).getByLabelText(
      "Search tiles, the web, or run a command",
    )
    await user.type(input, "github")

    expect(
      within(palette).getByRole("option", { name: /GitHub/ }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        within(palette).queryByRole("option", { name: /MDN/ }),
      ).not.toBeInTheDocument(),
    )
    expect(document.querySelectorAll(".tile")).toHaveLength(3)
  })

  test("asks before deleting a link and cancels safely", async () => {
    seed(seeded)
    const user = userEvent.setup()
    render(App)

    await user.click(screen.getByRole("button", { name: "Actions for GitHub" }))
    await user.click(await screen.findByRole("menuitem", { name: "Delete link…" }))

    expect(
      await screen.findByRole("alertdialog", { name: "Delete “GitHub”?" }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.getByRole("link", { name: "Open GitHub" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Actions for GitHub" }))
    await user.click(await screen.findByRole("menuitem", { name: "Delete link…" }))
    await user.click(await screen.findByRole("button", { name: "Delete GitHub" }))

    await waitFor(() =>
      expect(screen.queryByRole("link", { name: "Open GitHub" })).not.toBeInTheDocument(),
    )
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain("GitHub")
  })

  test("reorders groups with the keyboard", async () => {
    seed(seeded)
    render(App)

    const handle = screen.getByRole("button", { name: "Reorder group Pinned" })
    handle.focus()
    await fireEvent.keyDown(handle, { key: " " })
    await fireEvent.keyDown(handle, { key: "ArrowDown" })
    await fireEvent.keyDown(handle, { key: " " })

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Board
      expect(saved.groups.map((group) => group.title)).toEqual([
        "Work",
        "Pinned",
      ])
    })
  })

  test("reorders tiles with the keyboard", async () => {
    seed(seeded)
    render(App)

    const links = screen.getAllByRole("link")
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      "Open GitHub github.com",
      "Open MDN developer.mozilla.org",
      "Open Linear linear.app",
    ])

    const handle = screen.getByRole("button", { name: "Reorder GitHub" })
    handle.focus()
    await fireEvent.keyDown(handle, { key: " " })
    await fireEvent.keyDown(handle, { key: "ArrowRight" })
    await fireEvent.keyDown(handle, { key: " " })

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Board
      expect(saved.groups[0].tiles.map((tile) => tile.title)).toEqual([
        "MDN",
        "GitHub",
      ])
    })
  })

  test("renders saved groups and their counts", () => {
    seed(seeded)
    render(App)

    expect(screen.getByRole("heading", { name: "Pinned" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Work" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open Linear" })).toHaveAttribute(
      "href",
      "https://linear.app/",
    )
  })
})

