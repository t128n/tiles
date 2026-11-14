/**
 * The experiment ids live in their own module without imports so the settings
 * model can depend on them without pulling in the registry.
 */
export const EXPERIMENT_IDS = [
  "hn",
  "calculator",
  "paste-links",
  "github",
] as const

export type ExperimentId = (typeof EXPERIMENT_IDS)[number]
