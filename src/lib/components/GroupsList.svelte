<script lang="ts">
  import { getBoardStore } from "../context"
  import { SortableRoot } from "../sortable-parts"
  import GroupSection from "./GroupSection.svelte"

  const store = getBoardStore()
  const groupIds = $derived(store.board.groups.map((group) => group.id))

  function labelFor(id: string): string {
    return store.board.groups.find((group) => group.id === id)?.title ?? "group"
  }
</script>

<SortableRoot
  value={groupIds}
  onValueChange={(ids) => store.reorderGroups(ids)}
  orientation="vertical"
  label={labelFor}
  class="groups"
  aria-label="Groups"
>
  {#snippet children(state: { order: string[] })}
    {#each state.order as id (id)}
      <GroupSection groupId={id} />
    {/each}
  {/snippet}
</SortableRoot>
