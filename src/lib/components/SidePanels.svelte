<script lang="ts">
  import { Tabs, TabsList, TabsPanel, TabsTab } from "@ui-sdk/svelte/tabs"
  import { getSettingsStore } from "../context"
  import { activeColumns } from "../experiments/registry"
  import type { ExperimentId } from "../experiments/ids"
  import GithubPanel from "./GithubPanel.svelte"
  import HnPanel from "./HnPanel.svelte"

  const settings = getSettingsStore()
  const columns = $derived(activeColumns(settings.value))

  // The last tab stays selected across reloads. A tab that is no longer
  // enabled falls back to the first one.
  const selected = $derived(
    columns.find((column) => column.id === settings.value.sidebarTab)?.id ??
      columns[0]?.id ??
      null,
  )

  function select(value: string | null) {
    if (!value || value === settings.value.sidebarTab) return
    settings.update({ sidebarTab: value as ExperimentId })
  }
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
    <Tabs value={selected} onValueChange={select}>
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
