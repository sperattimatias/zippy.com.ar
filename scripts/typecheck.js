#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const projects = [
  'apps/api-gateway/tsconfig.json',
  'services/auth/tsconfig.json',
  'services/ride/tsconfig.json',
  'services/driver/tsconfig.json',
  'services/payment/tsconfig.json',
];

for (const project of projects) {
  const result = spawnSync('npx', ['tsc', '-p', project, '--noEmit'], { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
