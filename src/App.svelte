<script lang="ts">
  import Header from './lib/components/Header.svelte';
  import TileGrid from './lib/components/TileGrid.svelte';
</script>

<div class="app-layout">
  <Header />
  <TileGrid />
</div>

<style>
  .app-layout {
    flex: 1;
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }
</style>
