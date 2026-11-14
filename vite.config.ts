import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineHastPlugin, markdownToHtml } from 'satteri'
import { readFileSync, writeFileSync } from 'node:fs'
import { normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }
const buildId = process.env.TILES_BUILD_ID ?? new Date().toISOString()

const userDocsDir = normalize(fileURLToPath(new URL('./docs/user', import.meta.url)))

const externalLinks = defineHastPlugin({
  name: 'tiles-external-links',
  element: {
    filter: ['a'],
    visit(node, ctx) {
      const href = node.properties?.href
      if (typeof href === 'string' && /^https?:/i.test(href)) {
        ctx.setProperty(node, 'target', '_blank')
        ctx.setProperty(node, 'rel', ['noreferrer'])
      }
    },
  },
})

// Markdown from docs/user is compiled to HTML at build time, so no Markdown
// parser ships to the browser and a broken doc fails the build.
function userDocs(): Plugin {
  return {
    name: 'tiles-user-docs',
    enforce: 'pre',
    transform(source, id) {
      const [file, query] = id.split('?')
      const path = normalize(file)
      if (query !== 'help' || !path.startsWith(userDocsDir + sep)) return

      const heading = /^#\s+(.+?)\s*$/m.exec(source)
      if (!heading) throw new Error(`${file} needs a "# Heading" for the help dialog.`)

      const body = source.replace(heading[0], '')
      const { html } = markdownToHtml(body, { hastPlugins: [externalLinks] })

      return {
        code: `export default ${JSON.stringify({ title: heading[1], html })}`,
        map: null,
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/tiles/',
  define: {
    __TILES_VERSION__: JSON.stringify(pkg.version),
    __TILES_BUILD__: JSON.stringify(buildId),
  },
  plugins: [
    userDocs(),
    svelte(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      manifest: {
        name: 'tiles',
        short_name: 'tiles',
        description: 'A local-first start page for the links you keep close.',
        start_url: '/tiles/',
        scope: '/tiles/',
        display: 'standalone',
        background_color: '#f5f5f5',
        theme_color: '#1e1e1e',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        globIgnores: ['**/version.json'],
        navigateFallback: '/tiles/index.html',
        navigateFallbackDenylist: [/^\/tiles\/version\.json$/],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
    {
      name: 'tiles-version',
      closeBundle() {
        writeFileSync(
          'dist/version.json',
          JSON.stringify(
            {
              version: pkg.version,
              buildId,
              builtAt: new Date().toISOString(),
            },
            null,
            2,
          ),
        )
      },
    },
  ],
})
