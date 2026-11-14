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

<div class="prompt-list">
  {#each PROMPTS as prompt (prompt.id)}
    <article class="prompt-item">
      <div class="prompt-head">
        <div class="prompt-copy">
          <h3 class="prompt-title">{prompt.title}</h3>
          <p class="prompt-description">{prompt.description}</p>
        </div>
        <Button class="button" onclick={() => copy(prompt)}>
          {copied === prompt.id ? "Copied" : "Copy"}
        </Button>
      </div>
      <details class="prompt-details">
        <summary>Show prompt</summary>
        <pre class="prompt-text">{prompt.text}</pre>
      </details>
    </article>
  {/each}
</div>
<span class="visually-hidden" aria-live="polite">
  {copied ? "Prompt copied to the clipboard." : ""}
</span>
