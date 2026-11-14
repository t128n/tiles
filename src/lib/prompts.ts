import boardPrompt from "./prompts/board.md?raw"
import suggestPrompt from "./prompts/suggest-tiles.md?raw"

export interface Prompt {
  id: string
  title: string
  description: string
  text: string
}

/**
 * The prompts agents use to work on this board. Settings shows them for
 * copying, so the Markdown files here are the only source.
 */
export const PROMPTS: Prompt[] = [
  {
    id: "suggest-tiles",
    title: "Suggest tiles",
    description:
      "Propose groups and links for a start page from a local browser history.",
    text: suggestPrompt.trim(),
  },
  {
    id: "board",
    title: "Board access",
    description:
      "Inspect or update the saved board through the browser, with a dry run first.",
    text: boardPrompt.trim(),
  },
]

export function promptById(id: string): Prompt | undefined {
  return PROMPTS.find((prompt) => prompt.id === id)
}
