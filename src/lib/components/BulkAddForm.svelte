<script lang="ts">
  import { CheckIcon } from "@lucide/svelte"
  import { Button } from "@ui-sdk/svelte/button"
  import { DialogClose } from "@ui-sdk/svelte/dialog"
  import {
    Field,
    FieldDescription,
    FieldLabel,
  } from "@ui-sdk/svelte/field"
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectItemIndicator,
    SelectTrigger,
    SelectValue,
  } from "@ui-sdk/svelte/select"
  import { Textarea } from "@ui-sdk/svelte/textarea"
  import { getBoardStore } from "../context"
  import { collectUrls } from "../suggestions"
  import { parseUrlList } from "../experiments/paste"
  import type { BulkAddPayload } from "../types"

  interface Props {
    payload: BulkAddPayload
    onclose: () => void
  }

  let { payload, onclose }: Props = $props()

  const store = getBoardStore()

  // svelte-ignore state_referenced_locally
  let text = $state(payload.seed ?? "")
  // svelte-ignore state_referenced_locally
  let groupId = $state(
    payload.groupId ?? store.board.groups[0]?.id ?? "",
  )
  let error = $state("")

  const groupItems = $derived(
    store.board.groups.map((entry) => ({
      value: entry.id,
      label: entry.title,
    })),
  )

  const parsed = $derived(parseUrlList(text, collectUrls(store.board)))

  const summary = $derived.by(() => {
    const count = parsed.links.length
    const parts = [`${count} ${count === 1 ? "link" : "links"}`]
    if (parsed.duplicates > 0) parts.push(`${parsed.duplicates} duplicate`)
    if (parsed.invalid > 0) parts.push(`${parsed.invalid} invalid`)
    if (parsed.overflow > 0) parts.push(`${parsed.overflow} over the limit`)
    return parts.join(" · ")
  })

  function save(event: SubmitEvent) {
    event.preventDefault()
    error = ""
    if (parsed.links.length === 0 || !groupId) return
    const added = store.addLinks(groupId, parsed.links)
    if (added === 0) {
      error = "Couldn’t add these links."
      return
    }
    onclose()
  }
</script>

<form class="dialog-form" onsubmit={save}>
  <Field>
    <FieldLabel>URLs</FieldLabel>
    <Textarea
      value={text}
      onValueChange={(value) => {
        text = value
        error = ""
      }}
      rows={6}
      autocomplete="off"
      spellcheck={false}
      placeholder={"github.com\nsvelte.dev\nhttps://vite.dev"}
      aria-label="URLs"
    />
    <FieldDescription>
      One address per line. Duplicates and existing links are skipped.
    </FieldDescription>
  </Field>

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
    <FieldDescription>{summary}</FieldDescription>
  </Field>

  {#if groupItems.length === 0}
    <FieldDescription>
      Create a group first, then paste the links again.
    </FieldDescription>
  {/if}

  {#if error}
    <p class="dialog-error" role="alert">{error}</p>
  {/if}

  <div class="dialog-footer">
    <DialogClose class="text-button">Cancel</DialogClose>
    <Button
      type="submit"
      class="button primary"
      disabled={parsed.links.length === 0 || !groupId}
    >
      {parsed.links.length === 1
        ? "Add 1 link"
        : `Add ${parsed.links.length} links`}
    </Button>
  </div>
</form>
