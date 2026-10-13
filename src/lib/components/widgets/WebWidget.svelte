<script lang="ts">
  import type { WebTile } from '../../../types';
  import { store } from '../../store.svelte';
  import { getFaviconUrl, extractHostname, normalizeUrl } from '../../utils/favicon';
  import { Trash2, ExternalLink } from 'lucide-svelte';

  let { tile }: { tile: WebTile } = $props();

  const url = $derived(normalizeUrl(tile.url));
  const hostname = $derived(extractHostname(tile.url));
  const favicon = $derived(getFaviconUrl(tile.url));
</script>

<div class="web-widget card">
  <div class="card-header">
    <div class="site-info">
      <img src={favicon} alt="" class="favicon" loading="lazy" />
      <span class="code-tag">{hostname}</span>
    </div>
    <button
      type="button"
      class="delete-btn"
      title="Delete tile"
      onclick={() => store.removeTile(tile.id)}
    >
      <Trash2 size={13} />
    </button>
  </div>

  <a href={url} target="_blank" rel="noreferrer" class="web-body">
    <span class="title" title={tile.title || hostname}>{tile.title || hostname}</span>
    <ExternalLink size={13} class="external-icon" />
  </a>
</div>

<style>
  .web-widget {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 10px 12px;
    height: 100%;
    min-height: 80px;
  }

  .site-info {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
  }

  .favicon {
    width: 15px;
    height: 15px;
    border-radius: var(--rounded-xs);
    flex-shrink: 0;
  }

  .web-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
    text-decoration: none;
    color: inherit;
    gap: 8px;
  }

  .title {
    font-size: 13px;
    font-weight: 500;
    line-height: 1.3;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.external-icon) {
    color: var(--text-muted);
    flex-shrink: 0;
    transition: color 80ms ease;
  }

  .web-body:hover :global(.external-icon) {
    color: var(--accent-turquoise);
  }
</style>
