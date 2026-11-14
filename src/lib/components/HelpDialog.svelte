<script lang="ts">
  import {
    BotIcon,
    BookOpenIcon,
    DatabaseIcon,
    KeyboardIcon,
    MonitorIcon,
    XIcon,
  } from "@lucide/svelte"
  import { useShortcut } from "@ui-sdk/svelte/shortcuts"
  import {
    Dialog,
    DialogBackdrop,
    DialogClose,
    DialogContent,
    DialogTitle,
    type DialogController,
  } from "@ui-sdk/svelte/dialog"
  import { HELP_DOCS } from "../help"
  import PromptList from "./PromptList.svelte"

  interface Props {
    controller: DialogController
  }

  let { controller }: Props = $props()

  const topics = [
    ...HELP_DOCS.map((doc) => ({
      id: doc.id,
      title: doc.title,
      html: doc.html,
    })),
    { id: "prompts", title: "Agent prompts", html: "" },
  ]

  let active = $state(topics[0].id)
  let pane: HTMLDivElement | undefined = $state()

  $effect(() => {
    const topic = active
    if (!topic || !pane) return
    pane.scrollTop = 0
  })

  const current = $derived(
    topics.find((topic) => topic.id === active) ?? topics[0],
  )

  const toggle = () =>
    controller.isOpen() ? controller.close() : controller.open()

  useShortcut("mod+?", toggle, { description: "Help" })
  useShortcut("mod+shift+?", toggle, { description: "Help" })
</script>

<Dialog {controller}>
  <DialogBackdrop />
  <DialogContent class="dialog panel-dialog">
    <div class="panel-shell">
      <aside class="panel-nav">
        <DialogTitle class="panel-nav-title">Help</DialogTitle>

        <nav class="panel-nav-list" aria-label="Help topics">
          <p class="panel-nav-group">Guide</p>
          <button
            class="panel-nav-item"
            type="button"
            aria-current={active === "getting-started" ? "page" : undefined}
            onclick={() => (active = "getting-started")}
          >
            <BookOpenIcon aria-hidden="true" />
            Getting started
          </button>
          <button
            class="panel-nav-item"
            type="button"
            aria-current={active === "browser-setup" ? "page" : undefined}
            onclick={() => (active = "browser-setup")}
          >
            <MonitorIcon aria-hidden="true" />
            Browser setup
          </button>
          <button
            class="panel-nav-item"
            type="button"
            aria-current={active === "keyboard" ? "page" : undefined}
            onclick={() => (active = "keyboard")}
          >
            <KeyboardIcon aria-hidden="true" />
            Keyboard
          </button>
          <button
            class="panel-nav-item"
            type="button"
            aria-current={active === "your-data" ? "page" : undefined}
            onclick={() => (active = "your-data")}
          >
            <DatabaseIcon aria-hidden="true" />
            Your data
          </button>

          <p class="panel-nav-group">For agents</p>
          <button
            class="panel-nav-item"
            type="button"
            aria-current={active === "prompts" ? "page" : undefined}
            onclick={() => (active = "prompts")}
          >
            <BotIcon aria-hidden="true" />
            Agent prompts
          </button>
        </nav>
      </aside>

      <section class="panel-pane" aria-label={current.title}>
        <header class="panel-pane-header">
          <h2 class="panel-pane-title">{current.title}</h2>
          <DialogClose class="icon-button panel-close" aria-label="Close help">
            <XIcon aria-hidden="true" />
          </DialogClose>
        </header>

        <div class="panel-pane-body" bind:this={pane}>
          {#if active === "prompts"}
            <p class="help-lede">
              Copy a prompt into an agent session. Both preview their changes
              and ask before writing to the board.
            </p>
            <PromptList />
          {:else}
            <article class="help-doc">{@html current.html}</article>
          {/if}
        </div>
      </section>
    </div>
  </DialogContent>
</Dialog>
