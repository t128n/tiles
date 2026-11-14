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
  import type { BulkAddPayload } from "../types"
  import BulkAddForm from "./BulkAddForm.svelte"

  interface Props {
    controller: DialogController<BulkAddPayload>
  }

  let { controller }: Props = $props()

  function key(payload: BulkAddPayload | undefined): string {
    return `${payload?.groupId ?? ""}:${payload?.seed ?? ""}`
  }
</script>

<Dialog controller={controller}>
  <DialogBackdrop />
  <DialogContent class="dialog">
    {#snippet children(state: DialogContentState<BulkAddPayload>)}
      <DialogTitle class="dialog-title">Add links</DialogTitle>
      <DialogDescription class="dialog-description">
        Paste a list of addresses and pick where they belong.
      </DialogDescription>
      {#if state.payload !== undefined}
        {#key key(state.payload)}
          <BulkAddForm
            payload={state.payload}
            onclose={() => controller.close()}
          />
        {/key}
      {/if}
    {/snippet}
  </DialogContent>
</Dialog>
