/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __TILES_VERSION__: string
declare const __TILES_BUILD__: string

declare module "*.md?help" {
  const doc: { title: string; html: string }
  export default doc
}
