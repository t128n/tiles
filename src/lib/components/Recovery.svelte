<script lang="ts">
  import { DownloadIcon, TriangleAlertIcon } from "@lucide/svelte"
  import { Button } from "@ui-sdk/svelte/button"
  import type { BoardStore } from "../board.svelte"
  import { downloadText } from "../download"

  interface Props {
    store: BoardStore
  }

  let { store }: Props = $props()

  function exportRaw() {
    downloadText("tiles-unreadable.json", store.exportRaw())
  }
</script>

<div class="empty-board recovery">
  <div class="empty-mark warning" aria-hidden="true">
    <TriangleAlertIcon />
  </div>
  <h1>Couldn’t read your saved tiles</h1>
  <p>
    {store.loadError?.message} Your saved data has not been overwritten.
  </p>
  <div class="empty-actions">
    <Button class="button" onclick={exportRaw}>
      <DownloadIcon aria-hidden="true" />
      Download raw data
    </Button>
    <Button class="button destructive" onclick={() => store.startFresh()}>
      Start fresh
    </Button>
  </div>
</div>
