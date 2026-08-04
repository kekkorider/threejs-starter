#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Script to copy the Three.js basis library from node_modules to public folder
 * This is useful for making the basis transcoder available to the client-side code
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcePath = path.join(__dirname, '../node_modules/three/examples/jsm/libs/basis');
const targetPath = path.join(__dirname, '../public/basis');

function copyBasisLib() {
  console.log('🔄 Copying Three.js basis library...');

  try {
    // Check if source exists
    if (!fs.existsSync(sourcePath)) {
      console.error('❌ Source path does not exist:', sourcePath);
      console.error('Make sure Three.js is installed: npm install three');
      process.exit(1);
    }

    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
      console.log('📁 Created target directory:', targetPath);
    }

    // Copy files
    const files = fs.readdirSync(sourcePath);

    files.forEach(file => {
      const sourceFile = path.join(sourcePath, file);
      const targetFile = path.join(targetPath, file);

      if (fs.statSync(sourceFile).isFile()) {
        fs.copyFileSync(sourceFile, targetFile);
        console.log(`📄 Copied: ${file}`);
      }
    });

    console.log('✅ Successfully copied basis library to:', targetPath);
    console.log('📋 Files copied:');
    files.forEach(file => {
      const stats = fs.statSync(path.join(sourcePath, file));
      console.log(`   - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });

  } catch (error) {
    console.error('❌ Error copying basis library:', error.message);
    process.exit(1);
  }
}

// Run the script
copyBasisLib();
