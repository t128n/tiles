<script lang="ts">
  import { store } from '../store.svelte';
  import WebWidget from './widgets/WebWidget.svelte';
  import NoteWidget from './widgets/NoteWidget.svelte';
  import FolderWidget from './widgets/FolderWidget.svelte';

  function handleDragStart(e: DragEvent, index: number) {
    e.dataTransfer?.setData('text/plain', String(index));
  }

  function handleDrop(e: DragEvent, targetIndex: number) {
    e.preventDefault();
    const sourceIndex = Number(e.dataTransfer?.getData('text/plain'));
    if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      const updated = [...store.tiles];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      store.tiles = updated;
      try {
        localStorage.setItem('tiles_app_data', JSON.stringify($state.snapshot(store.tiles)));
      } catch {}
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
  }
</script>

<main class="grid-container">
  {#if store.tiles.length === 0}
    <div class="empty-state">
      <p class="empty-text">No tiles configured. Click <span class="code-tag">+ Add Tile</span> to begin.</p>
    </div>
  {:else}
    <div class="tile-grid-center">
      <div class="tile-grid">
        {#each store.tiles as tile, i (tile.id)}
          <div
            class="grid-item"
            draggable="true"
            ondragstart={(e) => handleDragStart(e, i)}
            ondragover={handleDragOver}
            ondrop={(e) => handleDrop(e, i)}
            role="region"
            aria-label={tile.title}
          >
            {#if tile.type === 'web'}
              <WebWidget {tile} />
            {:else if tile.type === 'notes'}
              <NoteWidget {tile} />
            {:else if tile.type === 'folder'}
              <FolderWidget {tile} />
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</main>

<style>
  .grid-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: var(--space-xl) var(--space-md);
    width: 100%;
    box-sizing: border-box;
  }

  .tile-grid-center {
    margin: auto;
    width: 100%;
    max-width: 1100px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .tile-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 300px));
    gap: var(--space-md);
    width: 100%;
    justify-content: center;
    align-content: center;
  }

  .grid-item {
    cursor: grab;
    transition: transform 80ms ease;
    display: flex;
    flex-direction: column;
  }

  .grid-item:active {
    cursor: grabbing;
    transform: scale(0.995);
  }

  .empty-state {
    margin: auto;
    text-align: center;
    padding: 48px 16px;
  }

  .empty-text {
    font-size: 13px;
    color: var(--text-muted);
    margin: 0;
  }
</style>
