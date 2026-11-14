# Your data

tiles keeps everything in this browser. There is no account and no server, so a board is not synced between browsers, profiles or devices.

## Where it lives

- The board is JSON in `localStorage` under `tiles:v1`.
- Settings are in `localStorage` under `tiles:settings:v1`.
- Clearing site data for the page, or using a private window and then closing it, removes both.

Nothing is written anywhere else, and no request carries your board.

## Back up and restore

**Settings → Data** exports the whole board as `tiles-YYYY-MM-DD.json` and imports a backup file. The command palette has **Export board** and **Import board** for the same actions.

An import is checked before anything changes: the file must parse as a board with valid http or https URLs, and the counts are shown for review. Only **Replace board** applies it, and that step can be undone for ten seconds from the toast at the bottom of the page.

An export is a plain JSON file, so you can keep it in version control, sync it yourself, or edit it by hand.

## When saved data cannot be read

A board that cannot be parsed is never overwritten. The page shows a recovery screen with two choices: download the raw saved value so nothing is lost, or start fresh with an empty board.

If the browser blocks storage or is out of space, changes stay in the current tab and a warning appears at the bottom. Export the board before closing the tab.

## Undo

Deleting a group, a tile or a link, resetting the board and importing a backup each keep one snapshot. The toast at the bottom offers **Undo** for ten seconds; after that the snapshot is dropped.

## Offline use and updates

A production build caches its app shell with a service worker, so tiles opens without a network connection. The first visit is still online.

**Settings → About** checks the published `version.json` against the running build and reloads to a newer one when it is available. A development build has no service worker.

## Site icons

Each tile requests the site's own icon in this order: `/apple-touch-icon.png`, `/favicon.ico`, `/assets/favicon.ico`. If none answers, the tile shows a letter instead. No icon service is involved, so these requests go directly to the sites you save.
