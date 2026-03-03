#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

type ProjectCheck = {
  name: string;
  project: string;
  workspaceDir?: string;
};

const checks: ProjectCheck[] = [
  {
    name: '@zippy/api-gateway',
    project: 'apps/api-gateway/tsconfig.json',
  },
  {
    name: '@zippy/auth',
    project: 'services/auth/tsconfig.json',
    workspaceDir: 'services/auth',
  },
  {
    name: '@zippy/ride',
    project: 'services/ride/tsconfig.json',
    workspaceDir: 'services/ride',
  },
  {
    name: '@zippy/driver',
    project: 'services/driver/tsconfig.json',
    workspaceDir: 'services/driver',
  },
  {
    name: '@zippy/payment',
    project: 'services/payment/tsconfig.json',
    workspaceDir: 'services/payment',
  },
];

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

for (const check of checks) {
  if (check.workspaceDir) {
    run('pnpm', ['--dir', check.workspaceDir, 'exec', 'prisma', 'generate']);
  }
  run('pnpm', ['exec', 'tsc', '-p', check.project, '--noEmit']);
}
