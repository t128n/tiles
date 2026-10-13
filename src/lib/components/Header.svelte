<script lang="ts">
  import AddTileDialog from './AddTileDialog.svelte';
  import { LayoutGrid, Search } from 'lucide-svelte';

  let searchQuery = $state('');

  function handleSearch(e: Event) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    if (/^(https?:\/\/|[a-z0-9-]+\.[a-z]{2,})/i.test(q)) {
      const url = /^https?:\/\//i.test(q) ? q : `https://${q}`;
      window.location.href = url;
    } else {
      window.location.href = `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
    }
  }
</script>

<header class="header">
  <div class="brand">
    <div class="brand-icon-box">
      <LayoutGrid size={16} />
    </div>
    <span class="brand-title">tiles</span>
  </div>

  <form class="search-form" onsubmit={handleSearch}>
    <Search size={14} class="search-icon" />
    <input
      type="text"
      placeholder="Search DuckDuckGo or jump to URL..."
      bind:value={searchQuery}
      class="search-input"
    />
  </form>

  <div class="actions">
    <AddTileDialog />
  </div>
</header>

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    gap: 16px;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--surface-base);
    position: sticky;
    top: 0;
    z-index: 20;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    user-select: none;
  }

  .brand-icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-turquoise);
  }

  .brand-title {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: -0.01em;
    color: var(--text-primary);
  }

  .search-form {
    flex: 1;
    max-width: 440px;
    position: relative;
    display: flex;
    align-items: center;
  }

  :global(.search-icon) {
    position: absolute;
    left: 10px;
    color: var(--text-muted);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 6px 10px 6px 32px;
    border-radius: var(--rounded-sm);
    background: var(--surface-layer-1);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-size: 12.5px;
    outline: none;
    transition: border-color 80ms ease;
  }

  .search-input:focus {
    border-color: var(--border-focus);
    background: var(--surface-base);
  }

  .search-input::placeholder {
    color: var(--text-muted);
    font-size: 12px;
  }

  .actions {
    display: flex;
    align-items: center;
  }
</style>
