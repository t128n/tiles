<script lang="ts">
  import {
    FolderIcon,
    PlusIcon,
    XIcon,
  } from "@lucide/svelte"
  import { Button } from "@ui-sdk/svelte/button"
  import {
    Popover,
    PopoverClose,
    PopoverContent,
    PopoverDescription,
    PopoverTitle,
    PopoverTrigger,
  } from "@ui-sdk/svelte/popover"
  import { findFolder } from "../board"
  import { getAppActions, getBoardStore } from "../context"
  import { SortableRoot } from "../sortable-parts"
  import FolderLinkRow from "./FolderLinkRow.svelte"

  interface Props {
    folderId: string
    groupId: string
  }

  let { folderId, groupId }: Props = $props()

  const store = getBoardStore()
  const actions = getAppActions()

  const folder = $derived(findFolder(store.board.groups, folderId))
  const ids = $derived(folder?.links.map((link) => link.id) ?? [])

  function labelFor(id: string): string {
    return folder?.links.find((link) => link.id === id)?.title ?? "link"
  }

  function addLink() {
    actions.openTile({
      kind: "link",
      groupId,
      folderId,
    })
  }
</script>

{#if folder}
  <Popover>
    <PopoverTrigger class="tile-main folder-main">
      <span class="tile-icon folder-icon" aria-hidden="true">
        <FolderIcon />
      </span>
      <span class="tile-title">
        <span class="visually-hidden">Open folder</span>{" "}{folder.title}
      </span>
      <span class="tile-meta" aria-hidden="true">
        {folder.links.length} {folder.links.length === 1 ? "link" : "links"}
      </span>
    </PopoverTrigger>

    <PopoverContent
      class="folder-popover"
      side="bottom"
      align="start"
      sideOffset={8}
      presentation="auto"
    >
      <div class="folder-popover-header">
        <PopoverTitle class="folder-title">{folder.title}</PopoverTitle>
        <PopoverDescription class="folder-count">
          {folder.links.length} {folder.links.length === 1 ? "link" : "links"}
        </PopoverDescription>
        <PopoverClose class="icon-button folder-close" aria-label="Close folder">
          <XIcon aria-hidden="true" />
        </PopoverClose>
      </div>

      {#if folder.links.length === 0}
        <p class="folder-empty">This folder is empty.</p>
      {:else}
        <SortableRoot
          value={ids}
          onValueChange={(next) => store.reorderFolderLinks(folderId, next)}
          orientation="vertical"
          label={labelFor}
          class="folder-links"
          aria-label={`Links in ${folder.title}`}
        >
          {#snippet children(state: { order: string[] })}
            {#each state.order as id (id)}
              <FolderLinkRow {folderId} linkId={id} {groupId} />
            {/each}
          {/snippet}
        </SortableRoot>
      {/if}

      <div class="folder-footer">
        <Button class="text-button" onclick={addLink}>
          <PlusIcon aria-hidden="true" />
          Add link
        </Button>
      </div>
    </PopoverContent>
  </Popover>
{/if}
