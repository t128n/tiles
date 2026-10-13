export type WidgetType = 'web' | 'notes' | 'folder';

export interface WebTile {
  id: string;
  type: 'web';
  title: string;
  url: string;
}

export interface NoteTile {
  id: string;
  type: 'notes';
  title: string;
  content: string;
}

export interface FolderLink {
  id: string;
  title: string;
  url: string;
}

export interface FolderTile {
  id: string;
  type: 'folder';
  title: string;
  links: FolderLink[];
}

export type Tile = WebTile | NoteTile | FolderTile;

export type NewTile =
  | { type: 'web'; title: string; url: string }
  | { type: 'notes'; title: string; content: string }
  | { type: 'folder'; title: string; links?: FolderLink[] };
