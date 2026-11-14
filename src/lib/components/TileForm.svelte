<script lang="ts">
  import { CheckIcon } from "@lucide/svelte"
  import { Button } from "@ui-sdk/svelte/button"
  import { DialogClose } from "@ui-sdk/svelte/dialog"
  import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
  } from "@ui-sdk/svelte/field"
  import { Input, createInputController } from "@ui-sdk/svelte/input"
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectItemIndicator,
    SelectTrigger,
    SelectValue,
  } from "@ui-sdk/svelte/select"
  import { findFolder } from "../board"
  import {
    getAppActions,
    getBoardStore,
    getSettingsStore,
  } from "../context"
  import { hasMultipleUrls } from "../experiments/paste"
  import { experimentEnabled } from "../settings.svelte"
  import type { FolderLink, Tile, TilePayload } from "../types"
  import { normalizeUrl } from "../url"

  interface Props {
    payload: TilePayload
    onclose: () => void
  }

  let { payload, onclose }: Props = $props()

  const store = getBoardStore()
  const settings = getSettingsStore()
  const actions = getAppActions()

  const group = $derived(
    store.board.groups.find((entry) => entry.id === payload.groupId),
  )
  const folder = $derived(
    payload.folderId ? findFolder(store.board.groups, payload.folderId) : null,
  )
  const existing = $derived.by((): Tile | FolderLink | undefined => {
    if (payload.folderId) {
      return folder?.links.find((link) => link.id === payload.tileId)
    }
    return group?.tiles.find((tile) => tile.id === payload.tileId)
  })

  // svelte-ignore state_referenced_locally
  let title = $state(existing?.title ?? "")
  // svelte-ignore state_referenced_locally
  let url = $state(existing && "url" in existing ? existing.url : "")
  // svelte-ignore state_referenced_locally
  let groupId = $state(payload.groupId)
  let urlError = $state("")

  const urlInput = createInputController()

  const groupItems = $derived(
    store.board.groups.map((entry) => ({
      value: entry.id,
      label: entry.title,
    })),
  )

  const isFolder = $derived(payload.kind === "folder")

  function onUrlPaste(event: ClipboardEvent) {
    if (payload.folderId) return
    if (!experimentEnabled(settings.value, "paste-links")) return
    const text = event.clipboardData?.getData("text") ?? ""
    if (!hasMultipleUrls(text)) return
    event.preventDefault()
    actions.openBulkAdd(text, groupId)
    // The bulk dialog opens once this one has closed, so two never overlap.
    onclose()
  }

  function save(event: SubmitEvent) {
    event.preventDefault()
    urlError = ""

    if (payload.kind === "folder") {
      if (payload.tileId) {
        store.updateTile(payload.groupId, payload.tileId, { title }, groupId)
      } else {
        store.addFolder(groupId, title)
      }
      onclose()
      return
    }

    const normalized = normalizeUrl(url)
    if (!normalized) {
      urlError = "Enter an address like example.com."
      urlInput.focus()
      return
    }

    if (payload.folderId && payload.tileId) {
      store.updateFolderLink(payload.folderId, payload.tileId, {
        title,
        url: normalized,
      })
    } else if (payload.folderId) {
      store.addFolderLink(payload.groupId, payload.folderId, {
        title,
        url: normalized,
      })
    } else if (payload.tileId) {
      store.updateTile(
        payload.groupId,
        payload.tileId,
        { title, url: normalized },
        groupId,
      )
    } else {
      store.addLink(groupId, { title, url: normalized })
    }
    onclose()
  }
</script>

<form class="dialog-form" onsubmit={save}>
  {#if isFolder}
    <Field>
      <FieldLabel>Folder name</FieldLabel>
      <Input
        value={title}
        onValueChange={(value) => (title = value)}
        required
        maxlength={120}
        placeholder="Dev tools"
        autocomplete="off"
      />
      <FieldDescription>Shown above the folder’s links.</FieldDescription>
    </Field>
  {:else}
    <Field invalid={urlError ? true : undefined}>
      <FieldLabel>URL</FieldLabel>
      <Input
        controller={urlInput}
        value={url}
        onValueChange={(value) => {
          url = value
          urlError = ""
        }}
        inputmode="url"
        autocomplete="off"
        spellcheck={false}
        placeholder="github.com"
        required
        onpaste={onUrlPaste}
      />
      {#if urlError}
        <FieldError match>{urlError}</FieldError>
      {:else}
        <FieldDescription>An http or https address.</FieldDescription>
      {/if}
    </Field>

    <Field>
      <FieldLabel>Title</FieldLabel>
      <Input
        value={title}
        onValueChange={(value) => (title = value)}
        maxlength={120}
        autocomplete="off"
        placeholder="Leave empty to use the site name"
      />
    </Field>
  {/if}

  {#if !payload.folderId}
    <Field>
      <FieldLabel>Group</FieldLabel>
      <Select
        items={groupItems}
        value={groupId}
        onValueChange={(value) => value && (groupId = value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Choose a group" />
        </SelectTrigger>
        <SelectContent class="menu">
          {#each groupItems as item (item.value)}
            <SelectItem value={item.value}>
              {item.label}
              <SelectItemIndicator>
                <CheckIcon aria-hidden="true" />
              </SelectItemIndicator>
            </SelectItem>
          {/each}
        </SelectContent>
      </Select>
    </Field>
  {/if}

  <div class="dialog-footer">
    <DialogClose class="text-button">Cancel</DialogClose>
    <Button type="submit" class="button primary">Save</Button>
  </div>
</form>
