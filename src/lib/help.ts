import browserSetup from "../../docs/user/browser-setup.md?help"
import gettingStarted from "../../docs/user/getting-started.md?help"
import keyboard from "../../docs/user/keyboard.md?help"
import yourData from "../../docs/user/your-data.md?help"

export interface HelpDoc {
  id: string
  title: string
  html: string
}

/**
 * The user guide. The Markdown files in docs/user are the only source; Vite
 * compiles them to HTML at build time.
 */
export const HELP_DOCS: HelpDoc[] = [
  { id: "getting-started", ...gettingStarted },
  { id: "browser-setup", ...browserSetup },
  { id: "keyboard", ...keyboard },
  { id: "your-data", ...yourData },
]
