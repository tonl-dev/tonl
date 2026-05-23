/**
 * Vite configuration for browser builds
 *
 * Optimized for tree-shaking to reduce bundle size
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/browser.ts'),
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
        globals: {},
        // Ensure consistent chunk naming for caching
        chunkFileNames: '[name]-[hash].js',
        // Preserve export names for better debugging
        minifyInternalExports: false
      },
      // Enable aggressive tree-shaking
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
        unknownGlobalSideEffects: false
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
        // Enable dead code elimination
        dead_code: true,
        // Remove unused code
        unused: true,
        // Collapse simple variable assignments
        collapse_vars: true,
        // Reduce var declarations
        reduce_vars: true
      },
      mangle: {
        // Preserve function names for debugging
        keep_fnames: false,
        // Preserve class names for debugging
        keep_classnames: false
      },
      format: {
        // Remove comments except for licenses
        comments: /^\**!|@license|@preserve/i
      }
    },
    target: 'es2020',
    outDir: 'dist/browser',
    emptyOutDir: true,
    sourcemap: false,
    // Report compressed sizes
    reportCompressedSize: true
  },
  resolve: {
    alias: {
      stream: 'stream-browserify'
    }
  }
});
