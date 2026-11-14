<script lang="ts">
  import { Tabs, TabsList, TabsPanel, TabsTab } from "@ui-sdk/svelte/tabs"
  import { getSettingsStore } from "../context"
  import { activeColumns } from "../experiments/registry"
  import type { ExperimentId } from "../experiments/ids"
  import GithubPanel from "./GithubPanel.svelte"
  import HnPanel from "./HnPanel.svelte"

  const settings = getSettingsStore()
  const columns = $derived(activeColumns(settings.value))
</script>

{#snippet panel(id: ExperimentId)}
  {#if id === "hn"}
    <HnPanel />
  {:else if id === "github"}
    <GithubPanel />
  {/if}
{/snippet}

{#if columns.length === 1}
  <aside class="side-column" aria-label={`${columns[0].title} panel`}>
    {@render panel(columns[0].id)}
  </aside>
{:else if columns.length > 1}
  <aside class="side-column side-column-tabs" aria-label="Side panels">
    <Tabs defaultValue={columns[0].id}>
      <TabsList class="side-tabs" aria-label="Side panels">
        {#each columns as column (column.id)}
          <TabsTab value={column.id}>{column.title}</TabsTab>
        {/each}
      </TabsList>
      {#each columns as column (column.id)}
        <TabsPanel value={column.id} keepMounted>
          {@render panel(column.id)}
        </TabsPanel>
      {/each}
    </Tabs>
  </aside>
{/if}
