#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('docker', ['compose', '-f', 'infra/docker-compose.local.yml', 'down', '-v']);
run('pnpm', ['db:migrate']);
run('pnpm', ['db:seed']);
