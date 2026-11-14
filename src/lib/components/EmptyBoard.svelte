<script lang="ts">
  import { LayoutGridIcon, PlusIcon } from "@lucide/svelte"
  import { Button } from "@ui-sdk/svelte/button"
  import { getAppActions } from "../context"

  const actions = getAppActions()

  function addFirstLink() {
    const groupId = actions.ensureGroup()
    if (groupId) actions.openTile({ kind: "link", groupId })
  }
</script>

<div class="empty-board">
  <div class="empty-mark" aria-hidden="true">
    <LayoutGridIcon />
  </div>
  <h2>Your start page is empty</h2>
  <p>Pin a link to get started, or make a group first. Everything stays in this browser.</p>
  <div class="empty-actions">
    <Button class="button primary" onclick={addFirstLink}>
      <PlusIcon aria-hidden="true" />
      Add your first link
    </Button>
    <Button class="text-button" onclick={() => actions.openGroup({})}>
      Create a group
    </Button>
  </div>
</div>
