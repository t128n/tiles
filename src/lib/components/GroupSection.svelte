<script lang="ts">
  import {
    EllipsisIcon,
    FolderPlusIcon,
    GripVerticalIcon,
    LinkIcon,
    PencilIcon,
    PlusIcon,
    Trash2Icon,
  } from "@lucide/svelte"
  import { Button } from "@ui-sdk/svelte/button"
  import {
    Menu,
    MenuContent,
    MenuItem,
    MenuSeparator,
    MenuTrigger,
  } from "@ui-sdk/svelte/menu"
  import { getAppActions, getBoardStore } from "../context"
  import { SortableHandle, SortableItem, SortableRoot } from "../sortable-parts"
  import TileCard from "./TileCard.svelte"

  interface Props {
    groupId: string
  }

  let { groupId }: Props = $props()

  const store = getBoardStore()
  const actions = getAppActions()

  const group = $derived(
    store.board.groups.find((entry) => entry.id === groupId),
  )
  const allIds = $derived(group?.tiles.map((tile) => tile.id) ?? [])

  function labelFor(id: string): string {
    return group?.tiles.find((tile) => tile.id === id)?.title ?? "tile"
  }

  function deleteGroup() {
    if (!group) return
    const count = group.tiles.length
    const title = group.title
    actions.confirm({
      title: `Delete “${title}”?`,
      description:
        count === 0
          ? "This removes the empty group."
          : `This deletes the group and its ${count} ${count === 1 ? "tile" : "tiles"}.`,
      confirmLabel: `Delete ${title}`,
      agentConfirm: `Deletes the group "${title}" and its ${count} ${count === 1 ? "tile" : "tiles"}`,
      onConfirm: () => store.removeGroup(groupId),
    })
  }
</script>

{#if group}
  <SortableItem
    value={group.id}
    label={group.title}
    id={`group-${group.id}`}
    class="group"
  >
    <div class="group-header">
      <SortableHandle
        value={group.id}
        label={`Reorder group ${group.title}`}
        class="grip group-grip"
      >
        <GripVerticalIcon aria-hidden="true" />
      </SortableHandle>

      <h2 class="group-title">{group.title}</h2>
      <span class="group-count" aria-hidden="true">{group.tiles.length}</span>

      <Menu>
        <MenuTrigger
          class="icon-button group-menu-trigger"
          aria-label={`Actions for ${group.title}`}
        >
          <EllipsisIcon aria-hidden="true" />
        </MenuTrigger>
        <MenuContent class="menu">
          <MenuItem
            onSelect={() => actions.openTile({ kind: "link", groupId })}
          >
            <LinkIcon aria-hidden="true" />
            Add link
          </MenuItem>
          <MenuItem
            onSelect={() => actions.openTile({ kind: "folder", groupId })}
          >
            <FolderPlusIcon aria-hidden="true" />
            Add folder
          </MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={() => actions.openGroup({ groupId })}>
            <PencilIcon aria-hidden="true" />
            Rename group
          </MenuItem>
          <MenuItem onSelect={deleteGroup}>
            <Trash2Icon aria-hidden="true" />
            Delete group…
          </MenuItem>
        </MenuContent>
      </Menu>
    </div>

    <SortableRoot
      value={allIds}
      onValueChange={(ids) => store.reorderTiles(groupId, ids)}
      orientation="grid"
      label={labelFor}
      class="tiles"
      aria-label={`Tiles in ${group.title}`}
    >
      {#snippet children(state: { order: string[] })}
        {#each state.order as id (id)}
          <TileCard tileId={id} {groupId} />
        {/each}
        <div class="tile-add-cell" role="listitem">
          <Button
            class="tile-add"
            aria-label={`Add link to ${group.title}`}
            title={`Add link to ${group.title}`}
            onclick={() => actions.openTile({ kind: "link", groupId })}
          >
            <PlusIcon aria-hidden="true" />
          </Button>
        </div>
      {/snippet}
    </SortableRoot>

  </SortableItem>
{/if}
