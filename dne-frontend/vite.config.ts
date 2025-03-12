import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact()],
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
          process: true
        })
      ]
    }
  },
  resolve: {
    alias: {
      buffer: 'buffer'
    }
  }
})
