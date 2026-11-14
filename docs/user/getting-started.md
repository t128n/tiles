# Getting started

tiles is a start page for the links you keep close. It is a static app: your board lives in this browser, with no account, no server and no sync.

## Groups, links and folders

- **Groups** are the sections of the page. Each group has a title and a grid of tiles.
- **Links** are tiles with a site icon, a title and the hostname.
- **Folders** are tiles that open a few links in a popover, or as a sheet on touch screens.

Create the first group from the empty board, from the command palette, or from the menu at the bottom right. Every group ends with an invisible ghost cell: hover it, or tab to it, to add a link straight into that group.

## Find things

Start typing anywhere outside a field, press <kbd>/</kbd>, or use <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> to open the palette. It lists the tiles that match by title or address, a web search for the query, and the commands below. The board behind it stays as it is. <kbd>Enter</kbd> runs the highlighted result, and <kbd>Escape</kbd> closes the palette.

## Change things

Drag a group or a tile by its grip handle to reorder it. With the keyboard, focus a grip handle, press <kbd>Space</kbd>, use the arrow keys, then press <kbd>Space</kbd> again.

Rename or delete a tile from its actions button. A delete, a reset and an import can be undone for ten seconds from the toast at the bottom of the page.

## Experiments

Turn individual experiments on under Settings → Advanced → Experimental. They are optional; the app works without them.

- **Calculator**: type an expression like `18*3` or `sqrt(144)` into the palette. The result appears as the first action, and choosing it copies the number.
- **Paste links**: paste a list of addresses into the URL field of Add link, or choose Add links in the palette, to add them all to one group at once. Undo removes the whole batch.
- **Hacker News**: adds a front page column next to the tiles.
- **GitHub tracker**: adds a column with recent releases and new repositories for the owners you list. Enter users or organisations such as `vercel-labs` in the GitHub owners field; up to ten, separated by commas.

When two columns are on, they share one sidebar with a tab per column.

Links you have already opened are dimmed, so the unread ones stand out.

## Settings

<kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>,</kbd> opens Settings. It holds the search engine, the link target, the theme, the experiments, and export and import. Help, at <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>?</kbd> or <kbd>Alt</kbd> + <kbd>?</kbd>, holds the guide and the agent prompt.
