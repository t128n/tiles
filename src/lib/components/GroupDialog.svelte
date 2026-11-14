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
  import type { GroupPayload } from "../types"
  import GroupForm from "./GroupForm.svelte"

  interface Props {
    controller: DialogController<GroupPayload>
  }

  let { controller }: Props = $props()

  function dialogTitle(payload: GroupPayload | undefined): string {
    return payload?.groupId ? "Edit group" : "New group"
  }
</script>

<Dialog controller={controller}>
  <DialogBackdrop />
  <DialogContent class="dialog dialog-small">
    {#snippet children(state: DialogContentState<GroupPayload>)}
      <DialogTitle class="dialog-title">{dialogTitle(state.payload)}</DialogTitle>
      <DialogDescription class="dialog-description">
        Groups keep related tiles together.
      </DialogDescription>
      {#if state.payload}
        {#key state.payload.groupId ?? "new"}
          <GroupForm payload={state.payload} onclose={() => controller.close()} />
        {/key}
      {/if}
    {/snippet}
  </DialogContent>
</Dialog>
