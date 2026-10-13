<script lang="ts">
  import type { FolderTile } from '../../../types';
  import { store } from '../../store.svelte';
  import { getFaviconUrl, normalizeUrl, extractHostname } from '../../utils/favicon';
  import { Trash2, Plus, X } from 'lucide-svelte';

  let { tile }: { tile: FolderTile } = $props();

  let isAdding = $state(false);
  let newTitle = $state('');
  let newUrl = $state('');

  function handleAddLink(e: Event) {
    e.preventDefault();
    const url = normalizeUrl(newUrl);
    if (!url) return;

    store.addFolderLink(tile.id, {
      title: newTitle.trim() || extractHostname(url),
      url,
    });

    newTitle = '';
    newUrl = '';
    isAdding = false;
  }
</script>

<div class="folder-widget card">
  <div class="card-header">
    <div class="header-left">
      <span class="card-title">{tile.title || 'Folder'}</span>
      <span class="code-tag">{tile.links.length}</span>
    </div>
    <button
      type="button"
      class="delete-btn"
      title="Delete folder"
      onclick={() => store.removeTile(tile.id)}
    >
      <Trash2 size={13} />
    </button>
  </div>

  <div class="link-list">
    {#each tile.links as link (link.id)}
      <div class="link-row">
        <a
          href={normalizeUrl(link.url)}
          target="_blank"
          rel="noreferrer"
          class="link-anchor"
          title={link.title}
        >
          <img src={getFaviconUrl(link.url)} alt="" class="favicon" loading="lazy" />
          <span class="link-title">{link.title}</span>
          <span class="link-host">{extractHostname(link.url)}</span>
        </a>
        <button
          type="button"
          class="remove-link-btn"
          title="Remove link"
          onclick={() => store.removeFolderLink(tile.id, link.id)}
        >
          <X size={12} />
        </button>
      </div>
    {/each}
  </div>

  {#if isAdding}
    <form class="add-form" onsubmit={handleAddLink}>
      <input
        type="text"
        placeholder="https://... or url"
        class="input input-sm"
        bind:value={newUrl}
        required
      />
      <input
        type="text"
        placeholder="Title (optional)"
        class="input input-sm"
        bind:value={newTitle}
      />
      <div class="form-actions">
        <button type="submit" class="btn btn-sm btn-primary">Add</button>
        <button
          type="button"
          class="btn btn-sm btn-ghost"
          onclick={() => (isAdding = false)}
        >
          Cancel
        </button>
      </div>
    </form>
  {:else}
    <button
      type="button"
      class="add-link-trigger"
      onclick={() => (isAdding = true)}
    >
      <Plus size={12} />
      <span>Add link</span>
    </button>
  {/if}
</div>

<style>
  .folder-widget {
    display: flex;
    flex-direction: column;
    padding: 10px 12px;
    height: 100%;
    min-height: 160px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .link-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 8px 0;
    flex: 1;
    overflow-y: auto;
  }

  .link-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 28px;
    padding: 0 6px;
    border-radius: var(--rounded-xs);
    transition: background 80ms ease;
  }

  .link-row:hover {
    background: var(--surface-layer-2);
  }

  .link-anchor {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: inherit;
    flex: 1;
    overflow: hidden;
  }

  .favicon {
    width: 14px;
    height: 14px;
    border-radius: var(--rounded-xs);
    flex-shrink: 0;
  }

  .link-title {
    font-size: 12.5px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .link-host {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .remove-link-btn {
    opacity: 0;
    padding: 2px 4px;
    border-radius: var(--rounded-xs);
    color: var(--text-muted);
    transition: opacity 80ms ease, color 80ms ease;
  }

  .link-row:hover .remove-link-btn {
    opacity: 0.7;
  }

  .remove-link-btn:hover {
    opacity: 1;
    color: var(--accent-magenta);
  }

  .add-link-trigger {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    font-weight: 500;
    color: var(--text-muted);
    padding: 4px 6px;
    border-radius: var(--rounded-xs);
    margin-top: auto;
    transition: color 80ms ease, background 80ms ease;
  }

  .add-link-trigger:hover {
    color: var(--accent-turquoise);
    background: var(--surface-layer-2);
  }

  .add-form {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px;
    border-radius: var(--rounded-sm);
    background: var(--surface-base);
    border: 1px solid var(--border-subtle);
    margin-top: auto;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
  }
</style>
