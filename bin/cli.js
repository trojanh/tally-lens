#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(__dirname, '..');

// Find electron executable
let electronPath = path.resolve(__dirname, '../node_modules/.bin/electron');
if (process.platform === 'win32') {
  electronPath += '.cmd';
}

if (!fs.existsSync(electronPath)) {
  // Try npx fallback
  electronPath = 'npx';
  const child = spawn(electronPath, ['electron', appPath], { stdio: 'inherit', shell: true });
  child.on('close', (code) => process.exit(code || 0));
} else {
  const child = spawn(electronPath, [appPath], { stdio: 'inherit' });
  child.on('close', (code) => process.exit(code || 0));
}
