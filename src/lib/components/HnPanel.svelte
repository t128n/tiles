<script lang="ts">
  import { RefreshCwIcon } from "@lucide/svelte"
  import { onMount } from "svelte"
  import { Button } from "@ui-sdk/svelte/button"
  import { getSettingsStore } from "../context"
  import { fetchFrontPage, type HnStory } from "../hn"

  const settings = getSettingsStore()

  let stories = $state.raw<HnStory[]>([])
  let status = $state<"loading" | "ready" | "error">("loading")
  let controller: AbortController | null = null

  async function load() {
    controller?.abort()
    const current = new AbortController()
    controller = current
    status = "loading"
    try {
      const next = await fetchFrontPage({ signal: current.signal })
      if (current.signal.aborted) return
      stories = next
      status = "ready"
    } catch {
      if (current.signal.aborted) return
      status = "error"
    }
  }

  onMount(() => {
    void load()
    return () => controller?.abort()
  })
</script>

<div class="feed-group">
  <div class="group-header">
    <h2 class="group-title">Hacker News</h2>
    <span class="group-count">{stories.length}</span>
    <span class="feed-badge">Beta</span>
    <Button
      class="icon-button feed-refresh"
      aria-label="Refresh Hacker News"
      title="Refresh"
      onclick={load}
    >
      <RefreshCwIcon aria-hidden="true" />
    </Button>
  </div>

  {#if stories.length > 0}
    <div class="feed-list">
      {#each stories as story (story.id)}
        <div class="feed-item">
          <a
            class="feed-item-title feed-title-link"
            href={story.url}
            target={settings.value.openLinksInNewTab ? "_blank" : undefined}
            rel={settings.value.openLinksInNewTab ? "noreferrer" : undefined}
          >
            {story.title}
          </a>
          <span class="feed-item-meta">
            {story.points}
            {story.points === 1 ? "point" : "points"}
            ·
            <a
              class="feed-comments"
              href={`https://news.ycombinator.com/item?id=${story.id}`}
              target={settings.value.openLinksInNewTab ? "_blank" : undefined}
              rel={settings.value.openLinksInNewTab ? "noreferrer" : undefined}
            >
              {story.comments === 0 ? "discuss" : `${story.comments} comments`}
            </a>
            {#if story.author}
              · {story.author}
            {/if}
          </span>
        </div>
      {/each}
    </div>
  {:else if status === "error"}
    <p class="feed-empty">
      Couldn't load Hacker News.
      <button class="text-button feed-retry" type="button" onclick={load}>
        Try again
      </button>
    </p>
  {:else}
    <p class="feed-empty">Loading stories…</p>
  {/if}
</div>
