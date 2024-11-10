import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',  // Using relative paths since this is in a subdirectory
  build: {
    outDir: '../build',  // This will put it one level up in a build/frog directory
    emptyOutDir: true,  // Clear the output directory before each build
  }
})