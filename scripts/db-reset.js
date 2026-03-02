#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('docker', ['compose', '-f', 'infra/docker-compose.local.yml', 'down', '-v']);
run(process.execPath, ['./scripts/db-migrate.js']);
run(process.execPath, ['./scripts/db-seed.js']);
