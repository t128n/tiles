<script lang="ts">
  import { onDestroy } from "svelte"
  import { Button } from "@ui-sdk/svelte/button"
  import { PROMPTS, type Prompt } from "../prompts"

  let copied = $state("")
  let copyTimer: ReturnType<typeof setTimeout> | undefined

  async function copy(prompt: Prompt) {
    try {
      await navigator.clipboard.writeText(prompt.text)
      copied = prompt.id
      clearTimeout(copyTimer)
      copyTimer = setTimeout(() => (copied = ""), 1600)
    } catch {
      copied = ""
    }
  }

  onDestroy(() => clearTimeout(copyTimer))
</script>

<div class="settings-card">
  {#each PROMPTS as prompt (prompt.id)}
    <div class="settings-row settings-row-prompt">
      <div class="settings-row-text">
        <span class="settings-row-label">{prompt.title}</span>
        <span class="settings-row-description">{prompt.description}</span>
        <details class="prompt-details">
          <summary>Show prompt</summary>
          <pre class="prompt-text">{prompt.text}</pre>
        </details>
      </div>
      <div class="settings-row-actions">
        <Button class="button" onclick={() => copy(prompt)}>
          {copied === prompt.id ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  {/each}
</div>
<span class="visually-hidden" aria-live="polite">
  {copied ? "Prompt copied to the clipboard." : ""}
</span>
