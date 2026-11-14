import suggestPrompt from "./prompts/suggest-tiles.md?raw"

export interface Prompt {
  id: string
  title: string
  description: string
  text: string
}

/**
 * The prompt agents use to suggest links for this board. Help shows it for
 * copying, so the Markdown file here is the only source.
 */
export const PROMPTS: Prompt[] = [
  {
    id: "suggest-tiles",
    title: "Suggest tiles",
    description:
      "Propose groups and links for a start page from a local browser history.",
    text: suggestPrompt.trim(),
  },
]

export function promptById(id: string): Prompt | undefined {
  return PROMPTS.find((prompt) => prompt.id === id)
}
