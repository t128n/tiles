<script lang="ts">
  import { RefreshCwIcon } from "@lucide/svelte"
  import { onDestroy } from "svelte"
  import { Button } from "@ui-sdk/svelte/button"
  import { getSettingsStore } from "../context"
  import {
    latestPerRepo,
    loadFeed,
    refreshFeed,
    relativeTime,
    type GithubFeed,
  } from "../github"

  const settings = getSettingsStore()

  let feed = $state.raw<GithubFeed>({ items: [], errors: [] })
  let status = $state<"loading" | "ready" | "error">("loading")
  let controller: AbortController | null = null
  let feedKey: string | null = null

  const owners = $derived(settings.value.githubOwners)
  const ownerKey = $derived(owners.join(","))
  const visible = $derived(latestPerRepo(feed.items))
  let loadedKey: string | null = null

  async function load(force = false) {
    controller?.abort()
    const current = new AbortController()
    controller = current

    if (owners.length === 0) {
      feed = { items: [], errors: [] }
      status = "ready"
      return
    }

    status = "loading"
    try {
      const next = force
        ? await refreshFeed(owners, { signal: current.signal })
        : await loadFeed(owners, { signal: current.signal })
      if (current.signal.aborted) return
      if (
        next.items.length === 0 &&
        next.errors.length > 0 &&
        feedKey === ownerKey
      ) {
        feed = { items: feed.items, errors: next.errors }
      } else {
        feed = next
        feedKey = ownerKey
      }
      status = "ready"
    } catch {
      if (current.signal.aborted) return
      status = "error"
    }
  }

  $effect(() => {
    const key = ownerKey
    if (loadedKey === key) return
    loadedKey = key
    void load()
  })

  onDestroy(() => controller?.abort())

  function problemCopy(): string {
    const messages = new Set(feed.errors.map((error) => error.message))
    return [...messages].join(" ")
  }

  function sub(item: GithubFeed["items"][number]): string {
    const age = relativeTime(item.createdAt)
    const label = item.kind === "release" ? item.title : "new repository"
    return age ? `${label} · ${age}` : label
  }
</script>

<div class="feed-group">
  <div class="group-header">
    <h2 class="group-title">GitHub</h2>
    <span class="group-count">{feed.items.length}</span>
    <span class="feed-badge">Beta</span>
    <Button
      class="icon-button feed-refresh"
      aria-label="Refresh GitHub"
      title="Refresh"
      onclick={() => load(true)}
    >
      <RefreshCwIcon aria-hidden="true" />
    </Button>
  </div>

  {#if owners.length === 0}
    <p class="feed-empty">
      Add GitHub owners in Settings → Experimental.
    </p>
  {:else if feed.items.length > 0}
    <div class="feed-list">
      {#each visible as item (item.id)}
        <a
          class="feed-item"
          href={item.url}
          target={settings.value.openLinksInNewTab ? "_blank" : undefined}
          rel={settings.value.openLinksInNewTab ? "noreferrer" : undefined}
        >
          <span class="feed-item-title feed-item-repo">{item.owner}/{item.repo}</span>
          <span class="feed-item-sub">{sub(item)}</span>
        </a>
      {/each}
    </div>
  {:else if status === "error"}
    <p class="feed-empty">
      Couldn't load GitHub.
      <button class="text-button feed-retry" type="button" onclick={() => load(true)}>
        Try again
      </button>
    </p>
  {:else if status === "loading"}
    <p class="feed-empty">Loading activity…</p>
  {:else if feed.errors.length === 0}
    <p class="feed-empty">Nothing recent.</p>
  {/if}

  {#if feed.errors.length > 0 && owners.length > 0}
    <p class="feed-empty" role="status">{problemCopy()}</p>
  {/if}
</div>
