<script lang="ts">
  import {
    BotIcon,
    CheckIcon,
    DatabaseIcon,
    FlaskConicalIcon,
    InfoIcon,
    PaletteIcon,
    SearchIcon,
    SlidersHorizontalIcon,
    XIcon,
  } from "@lucide/svelte"
  import { useShortcut } from "@ui-sdk/svelte/shortcuts"
  import { Button } from "@ui-sdk/svelte/button"
  import {
    Dialog,
    DialogBackdrop,
    DialogClose,
    DialogContent,
    DialogTitle,
    type DialogController,
  } from "@ui-sdk/svelte/dialog"
  import { Input } from "@ui-sdk/svelte/input"
  import { Switch, SwitchThumb } from "@ui-sdk/svelte/switch"
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectItemIndicator,
    SelectTrigger,
    SelectValue,
  } from "@ui-sdk/svelte/select"
  import { parseBoard } from "../board"
  import { boardSummary, exportBoard } from "../backup"
  import { EXPERIMENTS } from "../experiments/registry"
  import {
    getBoardStore,
    getSettingsStore,
    type SettingsRequest,
  } from "../context"
  import type { Board } from "../types"
  import { SEARCH_ENGINES, type SearchEngine } from "../url"
  import type { Theme } from "../settings.svelte"
  import { experimentEnabled, parseOwnerInput } from "../settings.svelte"
  import type { PwaStore } from "../pwa.svelte"
  import { checkForUpdate, localVersion, type UpdateStatus } from "../version"
  import PromptList from "./PromptList.svelte"

  interface Props {
    controller: DialogController
    pwa: PwaStore
    request?: SettingsRequest | null
  }

  let { controller, pwa, request = null }: Props = $props()

  const settings = getSettingsStore()
  const store = getBoardStore()

  let versionStatus = $state<UpdateStatus | null>(null)
  let checking = $state(false)
  let search = $state("")
  let active = $state("general")

  let fileInput: HTMLInputElement | null = $state(null)
  let importPreview = $state<{ board: Board; name: string } | null>(null)
  let importError = $state("")

  // svelte-ignore state_referenced_locally
  let ownerText = $state(settings.value.githubOwners.join(", "))

  function commitOwners() {
    const owners = parseOwnerInput(ownerText)
    if (
      owners.length === settings.value.githubOwners.length &&
      owners.every((owner, index) => owner === settings.value.githubOwners[index])
    ) {
      ownerText = owners.join(", ")
      return
    }
    settings.update({ githubOwners: owners })
    ownerText = owners.join(", ")
  }

  $effect(() => {
    if (request?.section) active = request.section
  })

  function chooseImportFile() {
    importError = ""
    fileInput?.click()
  }

  async function importFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ""
    if (!file) return
    importPreview = null
    importError = ""
    let raw: string
    try {
      raw = await file.text()
    } catch {
      importError = "Couldn't read that file."
      return
    }
    const parsed = parseBoard(raw)
    if (!parsed.ok) {
      importError = parsed.error
      return
    }
    importPreview = { board: parsed.board, name: file.name }
  }

  function cancelImport() {
    importPreview = null
    importError = ""
  }

  function replaceBoard() {
    if (!importPreview) return
    if (!store.replaceBoard(importPreview.board)) {
      importError = "Couldn't write the board."
      return
    }
    importPreview = null
    controller.close()
  }

  const query = $derived(search.trim().toLowerCase())

  const sections = [
    {
      id: "general",
      label: "General",
      terms: ["general", "search engine", "google", "duckduckgo", "brave", "links", "new tab"],
    },
    {
      id: "appearance",
      label: "Appearance",
      terms: ["appearance", "theme", "light", "dark", "system"],
    },
    {
      id: "data",
      label: "Data",
      terms: ["data", "export", "import", "backup", "restore", "json"],
    },
    {
      id: "experimental",
      label: "Experimental",
      terms: [
        "experimental",
        ...EXPERIMENTS.flatMap((experiment) => [
          experiment.title.toLowerCase(),
          experiment.description.toLowerCase(),
          ...experiment.terms,
        ]),
      ],
    },
    {
      id: "prompts",
      label: "Prompts",
      terms: ["prompts", "copy", "agent", "history", "suggest", "board"],
    },
    {
      id: "about",
      label: "About",
      terms: [
        "about",
        "version",
        "update",
        "offline",
        "cache",
        "service worker",
      ],
    },
  ]

  const visibleSections = $derived(
    sections.filter(
      (section) =>
        (section.id !== "experimental" || EXPERIMENTS.length > 0) &&
        (!query || section.terms.some((term) => term.includes(query))),
    ),
  )

  const current = $derived(
    visibleSections.find((section) => section.id === active) ??
      visibleSections[0] ??
      null,
  )

  function sectionVisible(id: string): boolean {
    return visibleSections.some((section) => section.id === id)
  }

  function show(...terms: string[]): boolean {
    return !query || terms.some((term) => term.includes(query))
  }

  const updateHint = $derived.by(() => {
    if (!pwa.isProduction) {
      return "Development build; the service worker is not active."
    }
    if (pwa.needRefresh) return "A new version is ready."
    if (versionStatus?.updateAvailable) return "A newer build is available."
    if (checking) return "Checking for updates…"
    if (versionStatus?.error) return "Couldn't check the remote version."
    if (versionStatus) return "You're up to date."
    return "Check the published build against this one."
  })

  async function checkUpdates() {
    checking = true
    versionStatus = await checkForUpdate()
    checking = false
    pwa.check()
  }

  const engineItems = SEARCH_ENGINES.map((engine) => ({
    value: engine.value,
    label: engine.label,
  }))

  const themes = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ]

  const linkTargets = [
    { value: "same", label: "Same tab" },
    { value: "new", label: "New tab" },
  ]

  useShortcut(
    "mod+,",
    () => (controller.isOpen() ? controller.close() : controller.open()),
    { description: "Settings" },
  )
</script>

<Dialog {controller} onOpenChange={(open) => open && checkUpdates()}>
  <DialogBackdrop />
  <DialogContent
    class="dialog panel-dialog"
    initialFocus="#settings-search"
  >
    <div class="panel-shell">
      <aside class="panel-nav">
        <DialogTitle class="panel-nav-title">Settings</DialogTitle>

        <div class="settings-search">
          <SearchIcon aria-hidden="true" />
          <Input
            id="settings-search"
            value={search}
            onValueChange={(value) => (search = value)}
            type="text"
            autocomplete="off"
            spellcheck={false}
            aria-label="Search settings"
            placeholder="Search settings…"
          />
        </div>

        <nav class="panel-nav-list" aria-label="Settings sections">
          {#if sectionVisible("general") || sectionVisible("appearance") || sectionVisible("data")}
            <p class="panel-nav-group">Options</p>
          {/if}
          {#if sectionVisible("general")}
            <button
              class="panel-nav-item"
              type="button"
              aria-current={current?.id === "general" ? "page" : undefined}
              onclick={() => (active = "general")}
            >
              <SlidersHorizontalIcon aria-hidden="true" />
              General
            </button>
          {/if}
          {#if sectionVisible("appearance")}
            <button
              class="panel-nav-item"
              type="button"
              aria-current={current?.id === "appearance" ? "page" : undefined}
              onclick={() => (active = "appearance")}
            >
              <PaletteIcon aria-hidden="true" />
              Appearance
            </button>
          {/if}
          {#if sectionVisible("data")}
            <button
              class="panel-nav-item"
              type="button"
              aria-current={current?.id === "data" ? "page" : undefined}
              onclick={() => (active = "data")}
            >
              <DatabaseIcon aria-hidden="true" />
              Data
            </button>
          {/if}

          {#if sectionVisible("experimental") || sectionVisible("prompts") || sectionVisible("about")}
            <p class="panel-nav-group">Advanced</p>
          {/if}
          {#if sectionVisible("experimental")}
            <button
              class="panel-nav-item"
              type="button"
              aria-current={current?.id === "experimental" ? "page" : undefined}
              onclick={() => (active = "experimental")}
            >
              <FlaskConicalIcon aria-hidden="true" />
              Experimental
            </button>
          {/if}
          {#if sectionVisible("prompts")}
            <button
              class="panel-nav-item"
              type="button"
              aria-current={current?.id === "prompts" ? "page" : undefined}
              onclick={() => (active = "prompts")}
            >
              <BotIcon aria-hidden="true" />
              Prompts
            </button>
          {/if}
          {#if sectionVisible("about")}
            <button
              class="panel-nav-item"
              type="button"
              aria-current={current?.id === "about" ? "page" : undefined}
              onclick={() => (active = "about")}
            >
              <InfoIcon aria-hidden="true" />
              About
            </button>
          {/if}
        </nav>
      </aside>

      <section class="panel-pane" aria-label={current?.label ?? "Settings"}>
        <header class="panel-pane-header">
          <h2 class="panel-pane-title">{current?.label ?? "Settings"}</h2>
          <DialogClose class="icon-button panel-close" aria-label="Close settings">
            <XIcon aria-hidden="true" />
          </DialogClose>
        </header>

        <div class="panel-pane-body">
          {#if !current}
            <p class="panel-empty">No settings match “{search.trim()}”.</p>
          {:else if current.id === "general"}
            <div class="settings-card">
              {#if show("search engine", "google", "duckduckgo", "brave")}
                <div class="settings-row">
                  <div class="settings-row-text">
                    <span class="settings-row-label">Search engine</span>
                    <span class="settings-row-description">
                      Used when a search term is not a URL.
                    </span>
                  </div>
                  <Select
                    items={engineItems}
                    value={settings.value.searchEngine}
                    onValueChange={(value) =>
                      value &&
                      settings.update({ searchEngine: value as SearchEngine })}
                  >
                    <SelectTrigger aria-label="Search engine" class="settings-control">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent class="menu">
                      {#each engineItems as engine (engine.value)}
                        <SelectItem value={engine.value}>
                          {engine.label}
                          <SelectItemIndicator>
                            <CheckIcon aria-hidden="true" />
                          </SelectItemIndicator>
                        </SelectItem>
                      {/each}
                    </SelectContent>
                  </Select>
                </div>
              {/if}

              {#if show("links", "new tab", "same tab", "target")}
                <div class="settings-row">
                  <div class="settings-row-text">
                    <span class="settings-row-label">Links open in</span>
                    <span class="settings-row-description">
                      Applies to tiles, folders and feed items.
                    </span>
                  </div>
                  <Select
                    items={linkTargets}
                    value={settings.value.openLinksInNewTab ? "new" : "same"}
                    onValueChange={(value) =>
                      value &&
                      settings.update({ openLinksInNewTab: value === "new" })}
                  >
                    <SelectTrigger aria-label="Links open in" class="settings-control">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent class="menu">
                      {#each linkTargets as target (target.value)}
                        <SelectItem value={target.value}>
                          {target.label}
                          <SelectItemIndicator>
                            <CheckIcon aria-hidden="true" />
                          </SelectItemIndicator>
                        </SelectItem>
                      {/each}
                    </SelectContent>
                  </Select>
                </div>
              {/if}
            </div>
          {:else if current.id === "appearance"}
            <div class="settings-card">
              {#if show("theme", "light", "dark", "system")}
                <div class="settings-row">
                  <div class="settings-row-text">
                    <span class="settings-row-label">Theme</span>
                    <span class="settings-row-description">
                      System follows your operating system.
                    </span>
                  </div>
                  <Select
                    items={themes}
                    value={settings.value.theme}
                    onValueChange={(value) =>
                      value && settings.update({ theme: value as Theme })}
                  >
                    <SelectTrigger aria-label="Theme" class="settings-control">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent class="menu">
                      {#each themes as theme (theme.value)}
                        <SelectItem value={theme.value}>
                          {theme.label}
                          <SelectItemIndicator>
                            <CheckIcon aria-hidden="true" />
                          </SelectItemIndicator>
                        </SelectItem>
                      {/each}
                    </SelectContent>
                  </Select>
                </div>
              {/if}
            </div>
          {:else if current.id === "data"}
            <div class="settings-card">
              {#if show("export", "backup", "download", "json")}
                <div class="settings-row">
                  <div class="settings-row-text">
                    <span class="settings-row-label">Export board</span>
                    <span class="settings-row-description">
                      Download every group, link and folder as JSON.
                    </span>
                  </div>
                  <div class="settings-row-actions">
                    <Button class="button" onclick={() => exportBoard(store)}>Export</Button>
                  </div>
                </div>
              {/if}

              {#if show("import", "backup", "restore", "json")}
                <div class="settings-row settings-row-import">
                  <div class="settings-row-text">
                    <span class="settings-row-label">Import board</span>
                    <span class="settings-row-description">
                      Replace this board with a backup file. Nothing changes
                      until you confirm.
                    </span>
                    {#if importPreview}
                      <span class="settings-import-preview">
                        {importPreview.name} · {boardSummary(importPreview.board)}
                      </span>
                    {/if}
                    {#if importError}
                      <span class="settings-import-error" role="alert">
                        {importError}
                      </span>
                    {/if}
                  </div>
                  <div class="settings-row-actions">
                    <input
                      bind:this={fileInput}
                      type="file"
                      accept=".json,application/json"
                      hidden
                      onchange={importFile}
                    />
                    {#if importPreview}
                      <Button class="text-button" onclick={cancelImport}>
                        Cancel
                      </Button>
                      <Button
                        class="button destructive"
                        data-agent-confirm={`Replaces the board with ${importPreview.name}`}
                        onclick={replaceBoard}
                      >
                        Replace board
                      </Button>
                    {:else}
                      <Button class="button" onclick={chooseImportFile}>
                        Choose file…
                      </Button>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
          {:else if current.id === "experimental"}
            <div class="settings-card">
              {#each EXPERIMENTS as experiment (experiment.id)}
                <div class="settings-row">
                  <div class="settings-row-text">
                    <span class="settings-row-label">{experiment.title}</span>
                    <span class="settings-row-description">
                      {experiment.description}
                    </span>
                  </div>
                  <Switch
                    aria-label={experiment.title}
                    checked={experimentEnabled(settings.value, experiment.id)}
                    onCheckedChange={(checked) =>
                      settings.update({
                        experiments: {
                          ...settings.value.experiments,
                          [experiment.id]: checked === true,
                        },
                      })}
                  >
                    <SwitchThumb />
                  </Switch>
                </div>
              {/each}

              {#if experimentEnabled(settings.value, "github") && show("owners", "github", "users", "organisations")}
                <div class="settings-row">
                  <div class="settings-row-text">
                    <span class="settings-row-label">GitHub owners</span>
                    <span class="settings-row-description">
                      Users or organisations to follow, separated by commas. Up
                      to ten.
                    </span>
                  </div>
                  <Input
                    class="settings-control"
                    value={ownerText}
                    onValueChange={(value) => (ownerText = value)}
                    onblur={commitOwners}
                    onkeydown={(event) => {
                      if (event.key === "Enter") commitOwners()
                    }}
                    type="text"
                    autocomplete="off"
                    spellcheck={false}
                    aria-label="GitHub owners"
                    placeholder="vercel-labs, anomalyco"
                  />
                </div>
              {/if}
            </div>
          {:else if current.id === "prompts"}
            <PromptList />
          {:else if current.id === "about"}
            <div class="settings-card">
              {#if show("version", "update", "build")}
                <div class="settings-row">
                  <div class="settings-row-text">
                    <span class="settings-row-label">Version</span>
                    <span class="settings-row-description">
                      v{localVersion.version} · build {localVersion.buildId.slice(
                        0,
                        7,
                      )}
                    </span>
                    <span class="settings-row-description">{updateHint}</span>
                    {#if versionStatus?.remote}
                      <span class="settings-row-description">
                        Remote v{versionStatus.remote.version} · build {versionStatus.remote.buildId.slice(
                          0,
                          7,
                        )}
                      </span>
                    {/if}
                  </div>
                  <div class="settings-row-actions">
                    <Button
                      class="button"
                      onclick={checkUpdates}
                      disabled={checking}
                    >
                      Check for updates
                    </Button>
                    {#if pwa.needRefresh || versionStatus?.updateAvailable}
                      <Button class="button primary" onclick={() => pwa.update()}>
                        Reload
                      </Button>
                    {/if}
                  </div>
                </div>
              {/if}

              {#if show("offline", "cache", "service worker")}
                <div class="settings-row">
                  <div class="settings-row-text">
                    <span class="settings-row-label">Offline use</span>
                    <span class="settings-row-description">
                      {pwa.isProduction
                        ? pwa.offlineReady
                          ? "The app shell is cached for offline use."
                          : "The app shell is cached after the first visit."
                        : "Available in a production build."}
                    </span>
                  </div>
                </div>
              {/if}
            </div>


          {/if}
        </div>

        <footer class="panel-footer">
          <Button class="text-button" onclick={() => settings.reset()}>
            Reset to defaults
          </Button>
          <DialogClose class="text-button">Done</DialogClose>
        </footer>
      </section>
    </div>
  </DialogContent>
</Dialog>
