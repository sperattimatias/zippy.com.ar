#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = process.platform === 'win32';
const script = isWindows ? 'migrate-all.ps1' : 'migrate-all.sh';
const scriptPath = path.join(__dirname, script);

const command = isWindows ? 'powershell' : 'bash';
const args = isWindows
  ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath]
  : [scriptPath];

const result = spawnSync(command, args, { stdio: 'inherit' });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
