<script lang="ts">
  import { Button } from "@ui-sdk/svelte/button"
  import { getBoardStore } from "../context"

  const store = getBoardStore()

  let timer: ReturnType<typeof setTimeout> | undefined

  $effect(() => {
    const entry = store.undoEntry
    clearTimeout(timer)
    if (!entry) return
    timer = setTimeout(() => store.dismissUndo(), 10_000)
    return () => clearTimeout(timer)
  })
</script>

{#if store.undoEntry}
  <div class="undo-toast" role="status">
    <span class="undo-message">{store.undoEntry.label}</span>
    <Button class="button undo-action" onclick={() => store.undo()}>Undo</Button>
  </div>
{/if}
