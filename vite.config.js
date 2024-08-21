import glsl from 'vite-plugin-glsl'
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 1234
  },
  plugins: [
    glsl()
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        webgpu: resolve(__dirname, 'webgpu.html'),
      }
    }
  }
})
