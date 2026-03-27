import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'SonicPi.js',
  description: 'Browser-native Sonic Pi with real SuperCollider synthesis via WebAssembly.',
  base: '/docs/',
  outDir: '../dist/docs',

  head: [
    ['link', { rel: 'icon', href: '/docs/favicon.svg' }],
  ],

  themeConfig: {
    logo: { src: '/docs/favicon.svg', alt: 'SonicPi.js' },

    nav: [
      { text: 'Try it', link: 'https://sonicpi.cc' },
      { text: 'npm', link: 'https://www.npmjs.com/package/@mjayb/sonicpijs' },
      { text: 'GitHub', link: 'https://github.com/MrityunjayBhardwaj/SonicPi.js' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Architecture', link: '/architecture' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'DSL Reference', link: '/dsl-reference' },
          { text: 'API Reference', link: '/api' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/MrityunjayBhardwaj/SonicPi.js' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Based on Sonic Pi by Sam Aaron.',
    },

    search: { provider: 'local' },
  },
})
