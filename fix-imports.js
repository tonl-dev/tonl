#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function collectJavaScriptFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      collectJavaScriptFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath.slice(__dirname.length + 1));
    }
  }

  return files;
}

function getDistJavaScriptFiles() {
  return collectJavaScriptFiles(join(__dirname, 'dist')).sort();
}

function resolveImportTarget(file, importPath) {
  return join(__dirname, dirname(file), importPath);
}

export function fixImports(content, file = '') {
  // Fix all relative imports to add .js extensions
  let fixed = content;

  // Handle static imports
  fixed = fixed.replace(/from "(\.\.?\/[^\"]+)"/g, (match, path) => {
    // Skip if already has .js extension
    if (path.endsWith('.js')) {
      return match;
    }
    // Skip if it's a Node.js built-in module or external package
    if (!path.startsWith('./') && !path.startsWith('../')) {
      return match;
    }
    return `from "${path}.js"`;
  });

  // Handle dynamic imports
  fixed = fixed.replace(/await import\('(\.\.?\/[^']+)'\)/g, (match, path) => {
    // Skip if already has .js extension
    if (path.endsWith('.js')) {
      return match;
    }
    // Check if it's a directory import (ends with /)
    if (path.endsWith('/')) {
      return `await import('${path}index.js')`;
    }
    // Check if path is a directory by checking if it has corresponding directory
    try {
      const stats = statSync(resolveImportTarget(file, path));
      if (stats.isDirectory()) {
        return `await import('${path}/index.js')`;
      }
    } catch {
      // File doesn't exist, assume it's a module
    }
    // Special case: optimization is always a directory
    if (path === './optimization') {
      return `await import('./optimization/index.js')`;
    }
    return `await import('${path}.js')`;
  });

  return fixed;
}

let hadError = false;

export function fixConfiguredFiles(fileList = getDistJavaScriptFiles()) {
  hadError = false;

  for (const file of fileList) {
    const fullPath = join(__dirname, file);

    try {
      const content = readFileSync(fullPath, 'utf8');
      const fixed = fixImports(content, file);

      if (content !== fixed) {
        writeFileSync(fullPath, fixed, 'utf8');
        console.log(`✅ Fixed imports in ${file}`);
      } else {
        console.log(`ℹ️  No changes needed in ${file}`);
      }
    } catch (error) {
      hadError = true;
      console.error(`❌ Error processing ${file}:`, error instanceof Error ? error.message : String(error));
    }
  }

  if (hadError) {
    throw new Error('Import fixing failed');
  }
}

const isCliEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCliEntrypoint) {
  try {
    fixConfiguredFiles();
    console.log('🎉 Import fixing complete!');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
