<script lang="ts">
  import {
    Dialog,
    DialogBackdrop,
    DialogContent,
    DialogDescription,
    DialogTitle,
    type DialogContentState,
    type DialogController,
  } from "@ui-sdk/svelte/dialog"
  import type { TilePayload } from "../types"
  import TileForm from "./TileForm.svelte"

  interface Props {
    controller: DialogController<TilePayload>
    onCloseComplete?: () => void
  }

  let { controller, onCloseComplete }: Props = $props()

  function dialogTitle(payload: TilePayload | undefined): string {
    if (!payload) return "Tile details"
    const action = payload.tileId ? "Edit" : "New"
    return `${action} ${payload.kind}`
  }
</script>

<Dialog
  controller={controller}
  onOpenChangeComplete={(isOpen) => {
    if (!isOpen) onCloseComplete?.()
  }}
>
  <DialogBackdrop />
  <DialogContent class="dialog">
    {#snippet children(state: DialogContentState<TilePayload>)}
      <DialogTitle class="dialog-title">{dialogTitle(state.payload)}</DialogTitle>
      <DialogDescription class="dialog-description">
        {state.payload?.kind === "folder"
          ? "Folders keep a few links together."
          : "Links open in this tab."}
      </DialogDescription>
      {#if state.payload}
        {#key `${state.payload.kind}:${state.payload.groupId}:${state.payload.folderId ?? ""}:${state.payload.tileId ?? ""}`}
          <TileForm payload={state.payload} onclose={() => controller.close()} />
        {/key}
      {/if}
    {/snippet}
  </DialogContent>
</Dialog>
