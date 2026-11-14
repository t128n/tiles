<script lang="ts">
  import { onMount } from "svelte"
  import { createAlertDialogController } from "@ui-sdk/svelte/alert-dialog"
  import { createDialogController } from "@ui-sdk/svelte/dialog"
  import { createBoardStore, type BoardStore } from "./lib/board.svelte"
  import {
    setAppActions,
    setBoardStore,
    setSettingsStore,
    type AppActions,
    type SettingsRequest,
  } from "./lib/context"
  import { exportBoard } from "./lib/backup"
  import { createSettingsStore, experimentEnabled } from "./lib/settings.svelte"
  import { createPwaStore } from "./lib/pwa.svelte"
  import { consumeUpdateRequest, type UpdateResult } from "./lib/update"
  import { activeColumns } from "./lib/experiments/registry"
  import type {
    BulkAddPayload,
    ConfirmPayload,
    GroupPayload,
    TilePayload,
  } from "./lib/types"
  import BulkAddDialog from "./lib/components/BulkAddDialog.svelte"
  import ConfirmDialog from "./lib/components/ConfirmDialog.svelte"
  import BottomDock from "./lib/components/BottomDock.svelte"
  import EmptyBoard from "./lib/components/EmptyBoard.svelte"
  import GroupsList from "./lib/components/GroupsList.svelte"
  import GroupDialog from "./lib/components/GroupDialog.svelte"
  import PaletteDialog from "./lib/components/PaletteDialog.svelte"
  import SidePanels from "./lib/components/SidePanels.svelte"
  import HelpDialog from "./lib/components/HelpDialog.svelte"
  import Recovery from "./lib/components/Recovery.svelte"
  import SettingsDialog from "./lib/components/SettingsDialog.svelte"
  import TileDialog from "./lib/components/TileDialog.svelte"
  import UndoToast from "./lib/components/UndoToast.svelte"

  interface Props {
    store?: BoardStore
  }

  let { store: providedStore }: Props = $props()

  // svelte-ignore state_referenced_locally
  const store = providedStore ?? createBoardStore()
  setBoardStore(store)

  const settings = createSettingsStore()
  setSettingsStore(settings)
  const pwa = createPwaStore()

  const tileDialog = createDialogController<TilePayload>()
  const groupDialog = createDialogController<GroupPayload>()
  const confirmDialog = createAlertDialogController<ConfirmPayload>()
  const settingsDialog = createDialogController()
  const helpDialog = createDialogController()
  const bulkAddDialog = createDialogController<BulkAddPayload>()

  let settingsRequest = $state<SettingsRequest | null>(null)
  let pendingBulk = $state<BulkAddPayload | null>(null)
  let updateResult = $state<UpdateResult | null>(null)

  // A reload after "Update now" comes back here: reopen Settings and say
  // whether the build changed.
  onMount(() => {
    const result = consumeUpdateRequest()
    if (!result) return
    updateResult = result
    settingsRequest = { section: "about" }
    settingsDialog.open()
  })

  function openPendingBulk() {
    if (!pendingBulk) return
    const payload = pendingBulk
    pendingBulk = null
    bulkAddDialog.open({ payload })
  }

  const actions: AppActions = {
    openTile: (payload) => tileDialog.open({ payload }),
    openGroup: (payload) => groupDialog.open({ payload }),
    openSettings: (section) => {
      settingsRequest = { section: section ?? null }
      settingsDialog.open()
    },
    exportBoard: () => exportBoard(store),
    openHelp: () => helpDialog.open(),
    openBulkAdd: (seed, groupId) => {
      if (store.loadError) return
      if (!experimentEnabled(settings.value, "paste-links")) return
      if (tileDialog.isOpen()) {
        pendingBulk = { seed, groupId }
        return
      }
      bulkAddDialog.open({ payload: { seed, groupId } })
    },
    confirm: (payload) => confirmDialog.open({ payload }),
    ensureGroup: () => store.ensureGroup(),
  }
  setAppActions(actions)

  const columns = $derived(activeColumns(settings.value))
  const bulkAddEnabled = $derived(
    experimentEnabled(settings.value, "paste-links"),
  )
</script>

{#if store.loadError}
  <Recovery {store} />
{:else}
  <div class="app-shell">
    <h1 class="visually-hidden">tiles</h1>

    <main class="page">
      <div class="workspace" class:with-panel={columns.length > 0}>
        <div class="groups-column">
          {#if store.board.groups.length === 0}
            <EmptyBoard />
          {:else}
            <GroupsList />
          {/if}
        </div>

        {#if columns.length > 0}
          <SidePanels />
        {/if}
      </div>
    </main>

    {#if store.saveError}
      <div class="storage-warning" role="status">
        {store.saveError}
      </div>
    {/if}

    <BottomDock />
    <UndoToast />
  </div>
{/if}

<PaletteDialog />
<TileDialog controller={tileDialog} onCloseComplete={openPendingBulk} />
<GroupDialog controller={groupDialog} />
{#if bulkAddEnabled}
  <BulkAddDialog controller={bulkAddDialog} />
{/if}
<SettingsDialog controller={settingsDialog} {pwa} request={settingsRequest} updated={updateResult} />
<HelpDialog controller={helpDialog} />
<ConfirmDialog controller={confirmDialog} />

