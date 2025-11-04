/**
 * Vite configuration for browser builds
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/browser-simple.ts'),
      name: 'TONL',
      formats: ['es', 'umd', 'iife'],
      fileName: (format) => {
        if (format === 'es') return 'tonl.esm.js';
        if (format === 'umd') return 'tonl.umd.js';
        if (format === 'iife') return 'tonl.iife.js';
        return `tonl.${format}.js`;
      }
    },
    rollupOptions: {
      output: {
        exports: 'named',
        globals: {}
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      }
    },
    target: 'es2020',
    outDir: 'dist/browser',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      stream: 'stream-browserify'
    }
  }
});
