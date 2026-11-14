import {
  createChange,
  createReorder,
  createRovingFocus,
  definePrimitive,
  type ReorderDraft,
  type ReorderReason,
} from "@ui-sdk/core"

export type SortableOrientation = "vertical" | "grid"

export interface SortableOptions {
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (
    value: string[],
    details: { reason: ReorderReason; event?: Event },
  ) => void
  orientation?: SortableOrientation
  disabled?: boolean
  label?: (key: string) => string | undefined
}

interface SortableState {
  value: string[]
  moving: ReorderDraft | null
  focused: string | null
}

export const sortable = definePrimitive({
  name: "sortable",
  options: {
    value: "list",
    defaultValue: "list",
    onValueChange: "callback",
    orientation: "string",
    disabled: "boolean",
    label: "value",
  },
  state: (options: SortableOptions): SortableState => ({
    value: options.value ?? options.defaultValue ?? [],
    moving: null,
    focused: null,
  }),
  controlled: ["value"],
  sync: (options: SortableOptions) =>
    options.value === undefined ? {} : { value: options.value },
  api: (context) => {
    const change = createChange(context)
    const reorder = createReorder(context, {
      slot: "item",
      key: "value",
      draft: "moving",
      orientation: () =>
        context.options().orientation === "grid" ? "grid" : "vertical",
      disabled: () => Boolean(context.options().disabled),
      label: (key) => context.options().label?.(key),
      set: (value, details) => change("value", value, details),
    })
    const roving = createRovingFocus(context, {
      slot: "handle",
      key: "focused",
      orientation: () =>
        context.options().orientation === "grid" ? "both" : "vertical",
      loop: () => false,
    })

    return {
      reorder,
      roving,
    }
  },
  slots: (slot) => ({
    root: slot({
      role: "list",
      state: (state, { api }) => ({ order: api.reorder.order(state) }),
      attrs: (state) => ({
        "data-moving": state.moving ? "" : undefined,
      }),
    }),
    item: slot<{ value: string; label: string }>({
      role: "listitem",
      props: { value: "string", label: "string" },
      attrs: (state, part) => ({
        tabindex: "-1",
        "aria-label": part.props.label,
        "data-grabbed": state.moving?.key === part.key ? "" : undefined,
        "data-dragging":
          state.moving?.key === part.key && state.moving.pointer
            ? ""
            : undefined,
      }),
      on: {
        keydown: (event, { api, key }) => {
          api.reorder.keydown(event as KeyboardEvent, key)
        },
      },
      bind: (el, part) => {
        const cleanup = part.api.reorder.bind(el, part)
        // The wrapper drops pointerdown handlers for this slot, so the drag
        // starts from a delegated listener on the item. It goes through the
        // core's reorder API; a second start is rejected there.
        const onDown = (event: PointerEvent) => {
          const target = event.target
          if (
            !(target instanceof Element) ||
            !target.closest('[data-slot="sortable-handle"]')
          ) {
            return
          }
          part.api.reorder.pointerdown(event, part.key)
        }
        el.addEventListener("pointerdown", onDown)
        return () => {
          el.removeEventListener("pointerdown", onDown)
          cleanup?.()
        }
      },
    }),
    handle: slot<{ value: string; label: string }>({
      props: { value: "string", label: "string" },
      attrs: (state, part) => ({
        type: "button",
        tabindex: part.api.roving.tabIndex(state, part),
        "aria-label": part.props.label,
        title: "Drag to reorder. Press Space, use the arrow keys, then Space to drop.",
        "data-agent-hidden": "",
      }),
      on: {
        keydown: (event, { el, api, key }) => {
          const handled = api.reorder.keydown(event as KeyboardEvent, key)
          if (!handled && el) api.roving.keydown(event as KeyboardEvent, el)
          if (handled && el) {
            // Moving the item re-inserts its node, which can blur the handle.
            // Put focus back so the next key still reaches the reorder.
            const restore = () => {
              if (el.ownerDocument.activeElement !== el) {
                el.focus({ preventScroll: true })
              }
            }
            queueMicrotask(restore)
            setTimeout(restore)
          }
        },
      },
      bind: (el, part) => part.api.roving.bind(el, part),
    }),
  }),
})
