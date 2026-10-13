# tiles 🪟

[![Deploy to GitHub Pages](https://github.com/t128n/tiles/actions/workflows/deploy.yml/badge.svg)](https://github.com/t128n/tiles/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> A minimalist, client-side Single Page Application (SPA) start page builder powered by Svelte 5, TypeScript, Vite, `bits-ui`, and `localStorage`.

**Live Demo**: [https://t128n.github.io/tiles/](https://t128n.github.io/tiles/)

## ✨ Features

- **🔒 Local-First Persistence**: All widgets and link collections persist directly in browser `localStorage`. Zero servers, zero telemetry, zero accounts.
- **🧩 Core Widgets**:
  - **🌐 Web Page**: Fast bookmark cards with automatic high-resolution favicons and direct navigation.
  - **📝 Notes**: Minimal scratchpad that auto-saves directly to `localStorage` on input.
  - **📁 Folders**: Grouped bookmarks with inline `+ link` addition and item removal.
- **✨ Accessible UI with `bits-ui`**:
  - Modal dialogs and widget tabs built using headless, keyboard-accessible primitives from `bits-ui`.
- **🎯 Centered & Responsive**:
  - The board stays horizontally and vertically centered by default in the viewport.
  - Adapts fluidly from wide displays down to mobile screens.
- **🔄 Drag & Drop**:
  - Reorder tiles naturally by dragging them across the grid.
- **🔍 Quick Search**:
  - Header search bar executes web searches (DuckDuckGo) or navigates directly when a URL is entered.
- **🎨 Modern Design**:
  - Built with the high-contrast **Oxocarbon** palette (IBM Carbon), 6px radii, and subtle elevation layering.
  - Automatic dark and light mode based on system preferences.

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or [Node.js](https://nodejs.org/) (v18+)

### Development

Clone the repository and start the development server:

```bash
git clone https://github.com/t128n/tiles.git
cd tiles
bun install
bun run dev
```

### Type Checking & Diagnostics

```bash
bun run check
```

### Production Build

```bash
bun run build
bun run preview
```

The production static files will be emitted to `dist/`.

## 🚀 Deployment to GitHub Pages

The project includes an automated GitHub Actions CI/CD pipeline in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) that builds and deploys to **[t128n.github.io/tiles/](https://t128n.github.io/tiles/)** on every push to `main`.

### Repository Setup

1. Go to your repository on GitHub: `https://github.com/t128n/tiles/settings/pages`
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. Push to `main` — the workflow will automatically run, check types, compile the bundle, and publish the site.

## 📂 Project Structure

```text
tiles/
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Pages CI/CD workflow (ubuntu-latest)
├── src/
│   ├── types/
│   │   └── index.ts             # TypeScript definitions (WebTile, NoteTile, FolderTile)
│   ├── lib/
│   │   ├── store.svelte.ts      # Reactive Svelte 5 store & localStorage sync
│   │   ├── utils/
│   │   │   └── favicon.ts       # Favicon resolver & URL normalizer
│   │   └── components/
│   │       ├── Header.svelte    # Top bar with omnibox & Add Tile trigger
│   │       ├── AddTileDialog.svelte # bits-ui Dialog & Tabs component
│   │       ├── TileGrid.svelte  # Centered responsive grid with drag & drop
│   │       └── widgets/
│   │           ├── WebWidget.svelte    # Web link card
│   │           ├── NoteWidget.svelte   # Auto-saving note card
│   │           └── FolderWidget.svelte # Bookmark collection card
│   ├── App.svelte               # App shell layout
│   ├── app.css                  # Oxocarbon theme tokens & base styles
│   └── main.ts                  # Application entry point
├── index.html                   # HTML template
├── vite.config.ts               # Vite configuration (base: '/tiles/')
└── package.json
```

## 📜 License

[MIT](LICENSE)
