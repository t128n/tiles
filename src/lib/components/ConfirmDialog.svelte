<script lang="ts">
  import {
    AlertDialog,
    AlertDialogBackdrop,
    AlertDialogClose,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
    type AlertDialogController,
  } from "@ui-sdk/svelte/alert-dialog"
  import type { DialogContentState } from "@ui-sdk/svelte/dialog"
  import type { ConfirmPayload } from "../types"

  interface Props {
    controller: AlertDialogController<ConfirmPayload>
  }

  let { controller }: Props = $props()
</script>

<AlertDialog controller={controller}>
  <AlertDialogBackdrop />
  <AlertDialogContent class="dialog dialog-small">
    {#snippet children(state: DialogContentState<ConfirmPayload>)}
      <AlertDialogTitle class="dialog-title">
        {state.payload?.title ?? "Are you sure?"}
      </AlertDialogTitle>
      <AlertDialogDescription class="dialog-description">
        {state.payload?.description ?? ""}
      </AlertDialogDescription>
      <div class="dialog-footer">
        <AlertDialogClose class="text-button">Cancel</AlertDialogClose>
        <AlertDialogClose
          value="confirm"
          class="button destructive"
          data-agent-confirm={state.payload?.agentConfirm}
          onclick={() => state.payload?.onConfirm()}
        >
          {state.payload?.confirmLabel ?? "Delete"}
        </AlertDialogClose>
      </div>
    {/snippet}
  </AlertDialogContent>
</AlertDialog>
