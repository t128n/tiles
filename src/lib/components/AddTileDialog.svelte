<script lang="ts">
  import { Dialog, Tabs } from 'bits-ui';
  import { store } from '../store.svelte';
  import { normalizeUrl, extractHostname } from '../utils/favicon';
  import { Plus, X, Globe, FileText, Folder } from 'lucide-svelte';

  let open = $state(false);
  let activeTab = $state('web');

  let webUrl = $state('');
  let webTitle = $state('');

  let noteTitle = $state('');
  let noteContent = $state('');

  let folderTitle = $state('');

  function resetForm() {
    webUrl = '';
    webTitle = '';
    noteTitle = '';
    noteContent = '';
    folderTitle = '';
    activeTab = 'web';
  }

  $effect(() => {
    if (!open) {
      resetForm();
    }
  });

  function handleSubmit(e: Event) {
    e.preventDefault();

    if (activeTab === 'web') {
      const url = normalizeUrl(webUrl);
      if (!url) return;
      store.addTile({
        type: 'web',
        title: webTitle.trim() || extractHostname(url),
        url,
      });
    } else if (activeTab === 'notes') {
      store.addTile({
        type: 'notes',
        title: noteTitle.trim() || 'Notes',
        content: noteContent.trim(),
      });
    } else if (activeTab === 'folder') {
      const title = folderTitle.trim();
      if (!title) return;
      store.addTile({
        type: 'folder',
        title,
        links: [],
      });
    }

    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger class="btn btn-primary">
    <Plus size={14} />
    <span>Add Tile</span>
  </Dialog.Trigger>

  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay" />
    <Dialog.Content class="dialog-content elevation-2">
      <div class="dialog-header">
        <Dialog.Title class="dialog-title">New Tile</Dialog.Title>
        <Dialog.Close class="close-btn" aria-label="Close">
          <X size={14} />
        </Dialog.Close>
      </div>

      <Tabs.Root bind:value={activeTab} class="tabs-root">
        <Tabs.List class="tabs-list">
          <Tabs.Trigger value="web" class="tabs-trigger">
            <Globe size={13} />
            <span>Web Page</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="notes" class="tabs-trigger">
            <FileText size={13} />
            <span>Notes</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="folder" class="tabs-trigger">
            <Folder size={13} />
            <span>Folder</span>
          </Tabs.Trigger>
        </Tabs.List>

        <form onsubmit={handleSubmit} class="dialog-form">
          <Tabs.Content value="web" class="tab-content">
            <div class="form-group">
              <label class="label" for="web-url">URL</label>
              <input
                id="web-url"
                type="text"
                class="input"
                placeholder="https://github.com"
                bind:value={webUrl}
                required={activeTab === 'web'}
              />
            </div>
            <div class="form-group">
              <label class="label" for="web-title">Title (Optional)</label>
              <input
                id="web-title"
                type="text"
                class="input"
                placeholder="GitHub"
                bind:value={webTitle}
              />
            </div>
          </Tabs.Content>

          <Tabs.Content value="notes" class="tab-content">
            <div class="form-group">
              <label class="label" for="note-title">Title</label>
              <input
                id="note-title"
                type="text"
                class="input"
                placeholder="Quick Scratchpad"
                bind:value={noteTitle}
              />
            </div>
            <div class="form-group">
              <label class="label" for="note-content">Note Content</label>
              <textarea
                id="note-content"
                class="input textarea"
                placeholder="Write notes here..."
                bind:value={noteContent}
                rows={4}
              ></textarea>
            </div>
          </Tabs.Content>

          <Tabs.Content value="folder" class="tab-content">
            <div class="form-group">
              <label class="label" for="folder-title">Folder Name</label>
              <input
                id="folder-title"
                type="text"
                class="input"
                placeholder="Dev Tools"
                bind:value={folderTitle}
                required={activeTab === 'folder'}
              />
            </div>
          </Tabs.Content>

          <div class="dialog-footer">
            <Dialog.Close class="btn btn-ghost" type="button">Cancel</Dialog.Close>
            <button type="submit" class="btn btn-primary">Create</button>
          </div>
        </form>
      </Tabs.Root>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.dialog-overlay) {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 50;
  }

  :global(.dialog-content) {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: 420px;
    z-index: 51;
    overflow: hidden;
    color: var(--text-primary);
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-subtle);
  }

  :global(.dialog-title) {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--text-primary);
  }

  :global(.close-btn) {
    padding: 4px;
    border-radius: var(--rounded-xs);
    color: var(--text-muted);
    transition: all 80ms ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  :global(.close-btn:hover) {
    background: var(--surface-layer-2);
    color: var(--text-primary);
  }

  :global(.tabs-root) {
    display: flex;
    flex-direction: column;
  }

  :global(.tabs-list) {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    background: var(--surface-base);
    padding: 3px;
    gap: 3px;
    border-bottom: 1px solid var(--border-subtle);
  }

  :global([data-tabs-trigger]) {
    display: flex !important;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    border-radius: var(--rounded-xs);
    transition: all 80ms ease;
    border: 1px solid transparent;
    cursor: pointer;
  }

  :global([data-tabs-trigger]:hover) {
    color: var(--text-primary);
    background: var(--surface-layer-2);
  }

  :global([data-tabs-trigger][data-state='active']) {
    background: var(--surface-layer-1);
    color: var(--accent-turquoise);
    border-color: var(--border-subtle);
    font-weight: 600;
  }

  :global([data-tabs-content]) {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  :global([data-tabs-content][data-state='inactive']),
  :global([data-tabs-content][hidden]) {
    display: none !important;
  }

  .dialog-form {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .label {
    font-size: 11.5px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .textarea {
    resize: vertical;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 6px;
  }
</style>
