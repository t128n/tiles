<script lang="ts">
  import {
    EllipsisIcon,
    GripVerticalIcon,
    PencilIcon,
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
  import { findFolder } from "../board"
  import { getAppActions, getBoardStore } from "../context"
  import { SortableHandle, SortableItem } from "../sortable-parts"
  import { hostnameOf } from "../url"
  import SiteIcon from "./SiteIcon.svelte"

  interface Props {
    folderId: string
    linkId: string
    groupId: string
  }

  let { folderId, linkId, groupId }: Props = $props()

  const store = getBoardStore()
  const actions = getAppActions()

  const folder = $derived(findFolder(store.board.groups, folderId))
  const link = $derived(folder?.links.find((entry) => entry.id === linkId))

  function editLink() {
    if (!link) return
    actions.openTile({
      kind: "link",
      groupId,
      folderId,
      tileId: link.id,
    })
  }

  function removeLink() {
    if (!link || !folder) return
    const title = link.title
    const folderTitle = folder.title
    actions.confirm({
      title: `Remove “${title}”?`,
      description: `This removes the link from “${folderTitle}”.`,
      confirmLabel: `Remove ${title}`,
      agentConfirm: `Removes "${title}" from the folder "${folderTitle}"`,
      onConfirm: () => store.removeFolderLink(folderId, linkId),
    })
  }
</script>

{#if link}
  <SortableItem value={link.id} label={link.title} class="folder-link-row">
    <Button class="folder-link-main">
      {#snippet render({ props })}
        <a {...props} href={link.url}>
          <SiteIcon url={link.url} title={link.title} size={18} />
          <span class="folder-link-title">
            <span class="visually-hidden">Open link</span>{" "}{link.title}
          </span>
          <span class="folder-link-host" aria-hidden="true"
            >{hostnameOf(link.url)}</span
          >
        </a>
      {/snippet}
    </Button>

    <Menu>
      <MenuTrigger
        class="icon-button folder-link-menu"
        aria-label={`Actions for link ${link.title}`}
      >
        <EllipsisIcon aria-hidden="true" />
      </MenuTrigger>
      <MenuContent class="menu">
        <MenuItem onSelect={editLink}>
          <PencilIcon aria-hidden="true" />
          Edit link…
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={removeLink}>
          <Trash2Icon aria-hidden="true" />
          Remove link…
        </MenuItem>
      </MenuContent>
    </Menu>

    <SortableHandle
      value={link.id}
      label={`Reorder link ${link.title}`}
      class="grip row-grip"
    >
      <GripVerticalIcon aria-hidden="true" />
    </SortableHandle>
  </SortableItem>
{/if}
