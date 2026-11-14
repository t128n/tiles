<script lang="ts">
  import {
    ArrowUpRightIcon,
    CircleHelpIcon,
    ClipboardPasteIcon,
    CopyIcon,
    DownloadIcon,
    FolderIcon,
    FolderPlusIcon,
    LinkIcon,
    PlusIcon,
    SearchIcon,
    SettingsIcon,
    UploadIcon,
  } from "@lucide/svelte"
  import { onMount } from "svelte"
  import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandGroupLabel,
    CommandInput,
    CommandItem,
    CommandItemIcon,
    CommandItemText,
    CommandList,
    CommandSeparator,
  } from "@ui-sdk/svelte/command"
  import {
    Dialog,
    DialogBackdrop,
    DialogContent,
    DialogTitle,
    createDialogController,
  } from "@ui-sdk/svelte/dialog"
  import { getAppActions, getBoardStore, getSettingsStore } from "../context"
  import { resolveQuery } from "../experiments/route"
  import { collectLinks } from "../palette"
  import { experimentEnabled } from "../settings.svelte"
  import { SEARCH_ENGINES, looksLikeUrl, navigate, normalizeUrl } from "../url"

  const controller = createDialogController()
  const store = getBoardStore()
  const settings = getSettingsStore()
  const actions = getAppActions()

  let query = $state("")
  let initial = $state("")
  let pending: (() => void) | null = null

  const groups = $derived(store.board.groups)
  const links = $derived(collectLinks(store.board))
  const bulkAdd = $derived(experimentEnabled(settings.value, "paste-links"))
  const trimmed = $derived(query.trim())
  const resolution = $derived(resolveQuery(query, settings.value))
  const address = $derived(looksLikeUrl(trimmed) && normalizeUrl(trimmed) !== null)
  const engine = $derived(
    SEARCH_ENGINES.find((entry) => entry.value === settings.value.searchEngine) ??
      SEARCH_ENGINES[0],
  )
  const mode = $derived.by<"none" | "copy" | "address" | "search">(() => {
    if (!trimmed || !resolution) return "none"
    if (resolution.kind === "copy") return "copy"
    return address ? "address" : "search"
  })
  const label = $derived.by(() => {
    if (mode === "none" || !resolution) return ""
    if (mode === "copy" && resolution.kind === "copy") {
      return `Copy ${resolution.value}`
    }
    if (mode === "address") return `Open ${trimmed}`
    return `Search ${engine.label} for “${trimmed}”`
  })

  function open(value = "") {
    initial = value
    query = value
    controller.open()
  }

  function close() {
    controller.close()
  }

  function onOpenChange(isOpen: boolean) {
    if (!isOpen) query = ""
  }

  function onCloseComplete(isOpen: boolean) {
    if (isOpen || !pending) return
    const action = pending
    pending = null
    action()
  }

  /** Run a command after the dialog has closed, so two dialogs never overlap. */
  function later(action: () => void) {
    pending = action
    close()
  }

  function openLink(url: string) {
    if (settings.value.openLinksInNewTab) {
      window.open(url, "_blank", "noreferrer")
      return
    }
    navigate(url)
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Nothing to copy when the clipboard is blocked.
    }
  }

  function run(value: string) {
    if (value.startsWith("link:")) {
      const link = links.find((entry) => entry.id === value.slice(5))
      if (!link) return
      close()
      openLink(link.url)
      return
    }

    if (value === "web") {
      const hit = resolution
      if (!hit) return
      close()
      if (hit.kind === "copy") void copy(hit.value)
      else openLink(hit.href)
      return
    }

    if (value === "export-board") {
      actions.exportBoard()
      close()
      return
    }

    if (value === "add-link") {
      later(() => {
        const groupId = actions.ensureGroup()
        if (groupId) actions.openTile({ kind: "link", groupId })
      })
      return
    }
    if (value === "add-folder") {
      later(() => {
        const groupId = actions.ensureGroup()
        if (groupId) actions.openTile({ kind: "folder", groupId })
      })
      return
    }
    if (value === "add-links") {
      later(() => actions.openBulkAdd())
      return
    }
    if (value === "new-group") {
      later(() => actions.openGroup({}))
      return
    }
    if (value.startsWith("group:")) {
      const id = value.slice(6)
      close()
      document
        .getElementById(`group-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }
    if (value === "settings") {
      later(() => actions.openSettings())
      return
    }
    if (value === "help") {
      later(() => actions.openHelp())
      return
    }
    if (value === "import-board") {
      later(() => actions.openSettings("data"))
    }
  }

  function typing(target: EventTarget | null): boolean {
    return (
      target instanceof Element &&
      !!target.closest(
        "input, textarea, select, [contenteditable='true'], [role='textbox']",
      )
    )
  }

  function popupOpen(): boolean {
    return !!document.querySelector(
      '[data-slot="dialog-content"], [data-slot="alert-dialog-content"], [data-slot="menu-content"], [data-slot="popover-content"]',
    )
  }

  onMount(() => {
    function onKeydown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing) return
      if (event.metaKey || event.ctrlKey) {
        if (event.altKey) return
        const key = event.key.toLowerCase()
        if (key !== "k" && key !== "f") return
        if (key === "f" && popupOpen()) return
        event.preventDefault()
        open()
        return
      }
      if (event.altKey) return
      if (popupOpen()) return
      if (typing(event.target)) return
      if (event.key.length !== 1) return
      if (event.key === " ") return
      event.preventDefault()
      open(event.key === "/" ? "" : event.key)
    }

    function onPalette() {
      open()
    }

    window.addEventListener("keydown", onKeydown)
    window.addEventListener("tiles:palette", onPalette)
    return () => {
      window.removeEventListener("keydown", onKeydown)
      window.removeEventListener("tiles:palette", onPalette)
    }
  })
</script>

<Dialog
  {controller}
  onOpenChange={onOpenChange}
  onOpenChangeComplete={onCloseComplete}
>
  <DialogBackdrop />
  <DialogContent
    class="dialog command-dialog"
    initialFocus="#tiles-palette-input"
  >
    <DialogTitle class="visually-hidden">Search and commands</DialogTitle>
    <Command
      defaultQuery={initial}
      onQueryChange={(value) => (query = value)}
      onAction={run}
      autoHighlight
      filter="contains"
    >
      <div class="command-input-row">
        <SearchIcon aria-hidden="true" />
        <CommandInput
          id="tiles-palette-input"
          aria-label="Search tiles, the web, or run a command"
          placeholder="Search tiles, the web, or run a command"
        />
        <kbd class="command-esc" aria-hidden="true">esc</kbd>
      </div>
      <CommandEmpty>No results.</CommandEmpty>
      <CommandList class="command-list">
        {#if mode !== "none" && resolution}
          <CommandGroup>
            <CommandGroupLabel>
              {mode === "address" ? "Address" : "Web"}
            </CommandGroupLabel>
            {#key label}
              <CommandItem value="web" label={`${label} ${trimmed}`}>
                <CommandItemIcon>
                  {#if mode === "copy"}
                    <CopyIcon aria-hidden="true" />
                  {:else if mode === "address"}
                    <ArrowUpRightIcon aria-hidden="true" />
                  {:else}
                    <SearchIcon aria-hidden="true" />
                  {/if}
                </CommandItemIcon>
                <CommandItemText>{label}</CommandItemText>
                {#if mode === "copy" && resolution.hint}
                  <span class="command-meta">{resolution.hint}</span>
                {/if}
              </CommandItem>
            {/key}
          </CommandGroup>
          <CommandSeparator />
        {/if}

        {#if links.length > 0}
          <CommandGroup>
            <CommandGroupLabel>Tiles</CommandGroupLabel>
            {#each links as link (link.id)}
              <CommandItem
                value={`link:${link.id}`}
                keywords={[link.url, link.group, link.folder ?? ""]}
              >
                <CommandItemIcon>
                  <LinkIcon aria-hidden="true" />
                </CommandItemIcon>
                <CommandItemText>{link.title}</CommandItemText>
                <span class="command-meta">
                  {link.folder ?? link.host}
                </span>
              </CommandItem>
            {/each}
          </CommandGroup>
          <CommandSeparator />
        {/if}

        <CommandGroup>
          <CommandGroupLabel>Actions</CommandGroupLabel>
          <CommandItem value="add-link">
            <CommandItemIcon>
              <PlusIcon aria-hidden="true" />
            </CommandItemIcon>
            <CommandItemText>Add link</CommandItemText>
          </CommandItem>
          <CommandItem value="add-folder">
            <CommandItemIcon>
              <FolderPlusIcon aria-hidden="true" />
            </CommandItemIcon>
            <CommandItemText>Add folder</CommandItemText>
          </CommandItem>
          {#if bulkAdd}
            <CommandItem value="add-links">
              <CommandItemIcon>
                <ClipboardPasteIcon aria-hidden="true" />
              </CommandItemIcon>
              <CommandItemText>Add links…</CommandItemText>
            </CommandItem>
          {/if}
          <CommandItem value="new-group">
            <CommandItemIcon>
              <FolderIcon aria-hidden="true" />
            </CommandItemIcon>
            <CommandItemText>New group</CommandItemText>
          </CommandItem>
          <CommandItem value="settings">
            <CommandItemIcon>
              <SettingsIcon aria-hidden="true" />
            </CommandItemIcon>
            <CommandItemText>Settings</CommandItemText>
          </CommandItem>
          <CommandItem value="help">
            <CommandItemIcon>
              <CircleHelpIcon aria-hidden="true" />
            </CommandItemIcon>
            <CommandItemText>Help</CommandItemText>
          </CommandItem>
          <CommandItem value="export-board">
            <CommandItemIcon>
              <DownloadIcon aria-hidden="true" />
            </CommandItemIcon>
            <CommandItemText>Export board</CommandItemText>
          </CommandItem>
          <CommandItem value="import-board">
            <CommandItemIcon>
              <UploadIcon aria-hidden="true" />
            </CommandItemIcon>
            <CommandItemText>Import board</CommandItemText>
          </CommandItem>
        </CommandGroup>

        {#if groups.length > 0}
          <CommandSeparator />
          <CommandGroup>
            <CommandGroupLabel>Groups</CommandGroupLabel>
            {#each groups as group (group.id)}
              <CommandItem value={`group:${group.id}`}>
                <CommandItemIcon>
                  <FolderIcon aria-hidden="true" />
                </CommandItemIcon>
                <CommandItemText>Go to {group.title}</CommandItemText>
              </CommandItem>
            {/each}
          </CommandGroup>
        {/if}
      </CommandList>
    </Command>
  </DialogContent>
</Dialog>




