import { createParts } from "@ui-sdk/svelte/primitive"
import { sortable } from "./sortable"

export const {
  Root: SortableRoot,
  Item: SortableItem,
  Handle: SortableHandle,
} = createParts(sortable, {
  root: "div",
  item: "div",
  handle: "button",
})
