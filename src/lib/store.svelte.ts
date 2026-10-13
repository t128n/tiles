import type { Tile, NewTile, FolderLink } from '../types';

const STORAGE_KEY = 'tiles_app_data';

const DEFAULT_TILES: Tile[] = [
  {
    id: '1',
    type: 'notes',
    title: 'Quick Notes',
    content: 'Welcome to Tiles!\nA minimalist, client-side start page.\n\nEverything is saved to your browser localStorage.',
  },
  {
    id: '2',
    type: 'folder',
    title: 'Dev Resources',
    links: [
      { id: 'l1', title: 'GitHub', url: 'https://github.com' },
      { id: 'l2', title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
      { id: 'l3', title: 'Vite', url: 'https://vite.dev' },
      { id: 'l4', title: 'Svelte', url: 'https://svelte.dev' },
    ],
  },
  {
    id: '3',
    type: 'web',
    title: 'GitHub',
    url: 'https://github.com',
  },
  {
    id: '4',
    type: 'web',
    title: 'Hacker News',
    url: 'https://news.ycombinator.com',
  },
];

function loadTiles(): Tile[] {
  if (typeof window === 'undefined') return DEFAULT_TILES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TILES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_TILES;
  } catch {
    return DEFAULT_TILES;
  }
}

class TilesStore {
  tiles = $state<Tile[]>(loadTiles());

  private save() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify($state.snapshot(this.tiles)));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  }

  addTile(newTile: NewTile) {
    const id = Date.now().toString();
    let tile: Tile;

    if (newTile.type === 'folder') {
      tile = {
        id,
        type: 'folder',
        title: newTile.title,
        links: newTile.links || [],
      };
    } else if (newTile.type === 'notes') {
      tile = {
        id,
        type: 'notes',
        title: newTile.title,
        content: newTile.content,
      };
    } else {
      tile = {
        id,
        type: 'web',
        title: newTile.title,
        url: newTile.url,
      };
    }

    this.tiles = [tile, ...this.tiles];
    this.save();
  }

  removeTile(id: string) {
    this.tiles = this.tiles.filter((t) => t.id !== id);
    this.save();
  }

  updateTile(id: string, updates: Partial<Tile>) {
    this.tiles = this.tiles.map((t) => (t.id === id ? ({ ...t, ...updates } as Tile) : t));
    this.save();
  }

  addFolderLink(folderId: string, link: { title: string; url: string }) {
    const newLink: FolderLink = {
      id: Date.now().toString(),
      title: link.title,
      url: link.url,
    };
    this.tiles = this.tiles.map((t) => {
      if (t.id === folderId && t.type === 'folder') {
        return { ...t, links: [...t.links, newLink] };
      }
      return t;
    });
    this.save();
  }

  removeFolderLink(folderId: string, linkId: string) {
    this.tiles = this.tiles.map((t) => {
      if (t.id === folderId && t.type === 'folder') {
        return { ...t, links: t.links.filter((l) => l.id !== linkId) };
      }
      return t;
    });
    this.save();
  }
}

export const store = new TilesStore();
