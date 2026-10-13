<script lang="ts">
  import type { NoteTile } from '../../../types';
  import { store } from '../../store.svelte';
  import { Trash2 } from 'lucide-svelte';

  let { tile }: { tile: NoteTile } = $props();

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    store.updateTile(tile.id, { content: target.value });
  }
</script>

<div class="note-widget card">
  <div class="card-header">
    <div class="header-left">
      <span class="card-title">{tile.title || 'Notes'}</span>
      <span class="code-tag">scratchpad</span>
    </div>
    <button
      type="button"
      class="delete-btn"
      title="Delete note"
      onclick={() => store.removeTile(tile.id)}
    >
      <Trash2 size={13} />
    </button>
  </div>

  <textarea
    class="note-textarea"
    value={tile.content}
    oninput={handleInput}
    placeholder="Write note here..."
  ></textarea>
</div>

<style>
  .note-widget {
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

  .note-textarea {
    flex: 1;
    width: 100%;
    margin-top: 8px;
    background: transparent;
    border: none;
    resize: none;
    outline: none;
    font-family: var(--font-sans);
    font-size: 13px;
    line-height: 1.45;
    letter-spacing: -0.005em;
    color: var(--text-primary);
    padding: 0;
  }

  .note-textarea::placeholder {
    color: var(--text-muted);
  }
</style>
