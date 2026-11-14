<script lang="ts">
  import { Button } from "@ui-sdk/svelte/button"
  import { DialogClose } from "@ui-sdk/svelte/dialog"
  import { Field, FieldLabel } from "@ui-sdk/svelte/field"
  import { Input } from "@ui-sdk/svelte/input"
  import { getBoardStore } from "../context"
  import type { GroupPayload } from "../types"

  interface Props {
    payload: GroupPayload
    onclose: () => void
  }

  let { payload, onclose }: Props = $props()

  const store = getBoardStore()
  const existing = $derived(
    payload.groupId
      ? store.board.groups.find((group) => group.id === payload.groupId)
      : undefined,
  )

  // svelte-ignore state_referenced_locally
  let title = $state(existing?.title ?? "")

  function save(event: SubmitEvent) {
    event.preventDefault()
    if (payload.groupId) {
      store.renameGroup(payload.groupId, title)
    } else {
      store.addGroup(title)
    }
    onclose()
  }
</script>

<form class="dialog-form" onsubmit={save}>
  <Field>
    <FieldLabel>Group name</FieldLabel>
    <Input
      value={title}
      onValueChange={(value) => (title = value)}
      required
      maxlength={120}
      autocomplete="off"
      placeholder="Work"
    />
  </Field>

  <div class="dialog-footer">
    <DialogClose class="text-button">Cancel</DialogClose>
    <Button type="submit" class="button primary">Save</Button>
  </div>
</form>
