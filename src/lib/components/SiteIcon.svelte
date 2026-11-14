<script lang="ts">
  import { hostnameOf, iconUrlsFor } from "../url"

  interface Props {
    url: string
    title: string
    size?: number
  }

  let { url, title, size = 22 }: Props = $props()
  let sourceIndex = $state(0)

  const sources = $derived(iconUrlsFor(url))
  const src = $derived(sources[sourceIndex] ?? null)
  const exhausted = $derived(sourceIndex >= sources.length)
  const initial = $derived(
    (title.trim()[0] || hostnameOf(url)[0] || "?").toUpperCase(),
  )

  $effect(() => {
    url
    sourceIndex = 0
  })
</script>

{#if src && !exhausted}
  <img
    class="site-icon"
    src={src}
    alt=""
    width={size}
    height={size}
    loading="lazy"
    decoding="async"
    onerror={() => (sourceIndex += 1)}
  />
{:else}
  <span
    class="site-icon site-icon-letter"
    style:width={`${size}px`}
    style:height={`${size}px`}
    style:font-size={`${Math.round(size * 0.48)}px`}
    aria-hidden="true">{initial}</span
  >
{/if}
