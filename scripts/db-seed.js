#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const isWindows = process.platform === 'win32';
const script = isWindows ? 'db-seed.ps1' : 'db-seed.sh';
const scriptPath = path.join(__dirname, script);

const command = isWindows ? 'powershell' : 'bash';
const args = isWindows
  ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath]
  : [scriptPath];

const result = spawnSync(command, args, { stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
