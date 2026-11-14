<script lang="ts">
  import { CommandIcon, EllipsisIcon } from "@lucide/svelte"
  import { formatShortcut } from "@ui-sdk/svelte/shortcuts"
  import {
    Menu,
    MenuContent,
    MenuItem,
    MenuSeparator,
    MenuTrigger,
  } from "@ui-sdk/svelte/menu"
  import { countTiles } from "../board"
  import { getAppActions, getBoardStore } from "../context"

  const store = getBoardStore()
  const actions = getAppActions()
  const shortcut = formatShortcut("mod+k")

  function openPalette() {
    window.dispatchEvent(new CustomEvent("tiles:palette"))
  }

  function resetAll() {
    actions.confirm({
      title: "Reset all tiles?",
      description: `This deletes all ${store.board.groups.length} groups and ${countTiles(store.board)} tiles in this browser.`,
      confirmLabel: "Reset everything",
      agentConfirm: "Deletes every group and tile on the start page",
      onConfirm: () => store.startFresh(),
    })
  }
</script>

<div class="dock">
  <div class="brand dock-brand">
    <span class="brand-mark" aria-hidden="true">
      <i></i><i></i><i></i><i></i>
    </span>
    <span class="brand-name">tiles</span>
  </div>

  <button
    class="dock-button"
    type="button"
    aria-label="Open command palette"
    onclick={openPalette}
  >
    <CommandIcon aria-hidden="true" />
    <kbd class="dock-kbd">{shortcut}</kbd>
  </button>

  <Menu>
    <MenuTrigger class="icon-button dock-settings" aria-label="Settings">
      <EllipsisIcon aria-hidden="true" />
    </MenuTrigger>
    <MenuContent class="menu" side="top" align="start" sideOffset={8}>
      <MenuItem onSelect={() => actions.openHelp()}>Help and setup…</MenuItem>
      <MenuItem onSelect={() => actions.openSettings()}>Settings…</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={() => actions.openGroup({})}>New group…</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={resetAll}>Reset all tiles…</MenuItem>
    </MenuContent>
  </Menu>
</div>
