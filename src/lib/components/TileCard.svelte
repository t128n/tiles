<script lang="ts">
  import {
    EllipsisIcon,
    GripVerticalIcon,
    LinkIcon,
    MoveRightIcon,
    PencilIcon,
    Trash2Icon,
  } from "@lucide/svelte"
  import { Button } from "@ui-sdk/svelte/button"
  import {
    Menu,
    MenuContent,
    MenuItem,
    MenuSeparator,
    MenuSub,
    MenuSubContent,
    MenuSubTrigger,
    MenuTrigger,
  } from "@ui-sdk/svelte/menu"
  import { getAppActions, getBoardStore } from "../context"
  import { SortableHandle, SortableItem } from "../sortable-parts"
  import { hostnameOf } from "../url"
  import FolderPopover from "./FolderPopover.svelte"
  import SiteIcon from "./SiteIcon.svelte"

  interface Props {
    tileId: string
    groupId: string
  }

  let { tileId, groupId }: Props = $props()

  const store = getBoardStore()
  const actions = getAppActions()

  const group = $derived(
    store.board.groups.find((entry) => entry.id === groupId),
  )
  const tile = $derived(group?.tiles.find((entry) => entry.id === tileId))
  const targetGroups = $derived(
    store.board.groups.filter((entry) => entry.id !== groupId),
  )

  function editTile() {
    if (!tile) return
    actions.openTile({
      kind: tile.kind,
      groupId,
      tileId: tile.id,
    })
  }

  function addLinkToFolder() {
    actions.openTile({
      kind: "link",
      groupId,
      folderId: tileId,
    })
  }

  function deleteTile() {
    if (!tile) return
    const isFolder = tile.kind === "folder"
    const count = isFolder ? tile.links.length : 0
    const title = tile.title
    actions.confirm({
      title: `Delete “${title}”?`,
      description: isFolder
        ? `This deletes the folder and its ${count} ${count === 1 ? "link" : "links"}.`
        : "This removes the link from your start page.",
      confirmLabel: `Delete ${title}`,
      agentConfirm: isFolder
        ? `Deletes the folder "${title}" and its ${count} ${count === 1 ? "link" : "links"}`
        : `Deletes the link "${title}"`,
      onConfirm: () => store.removeTile(groupId, tileId),
    })
  }
</script>

{#if tile}
  <SortableItem value={tile.id} label={tile.title} class="tile">
    {#if tile.kind === "link"}
      <Button class="tile-main">
        {#snippet render({ props })}
          <a {...props} href={tile.url}>
            <span class="tile-icon">
              <SiteIcon url={tile.url} title={tile.title} size={24} />
            </span>
            <span class="tile-title">
              <span class="visually-hidden">Open</span>{" "}{tile.title}
            </span>
            <span class="tile-meta" aria-hidden="true">{hostnameOf(tile.url)}</span>
          </a>
        {/snippet}
      </Button>
    {:else}
      <FolderPopover folderId={tile.id} {groupId} />
    {/if}

    <Menu>
      <MenuTrigger
        class="icon-button tile-menu-trigger"
        aria-label={`Actions for ${tile.title}`}
      >
        <EllipsisIcon aria-hidden="true" />
      </MenuTrigger>
      <MenuContent class="menu">
        <MenuItem onSelect={editTile}>
          <PencilIcon aria-hidden="true" />
          Edit {tile.kind}…
        </MenuItem>
        {#if tile.kind === "folder"}
          <MenuItem onSelect={addLinkToFolder}>
            <LinkIcon aria-hidden="true" />
            Add link…
          </MenuItem>
        {/if}
        {#if targetGroups.length > 0}
          <MenuSub>
            <MenuSubTrigger>
              <MoveRightIcon aria-hidden="true" />
              Move to group
            </MenuSubTrigger>
            <MenuSubContent class="menu">
              {#each targetGroups as target (target.id)}
                <MenuItem
                  onSelect={() => store.moveTile(groupId, tileId, target.id)}
                >
                  Move to {target.title}
                </MenuItem>
              {/each}
            </MenuSubContent>
          </MenuSub>
        {/if}
        <MenuSeparator />
        <MenuItem onSelect={deleteTile}>
          <Trash2Icon aria-hidden="true" />
          Delete {tile.kind}…
        </MenuItem>
      </MenuContent>
    </Menu>

    <SortableHandle
      value={tile.id}
      label={`Reorder ${tile.title}`}
      class="grip tile-grip"
    >
      <GripVerticalIcon aria-hidden="true" />
    </SortableHandle>
  </SortableItem>
{/if}
