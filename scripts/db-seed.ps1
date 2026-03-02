$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$composeFile = $env:COMPOSE_FILE
if ([string]::IsNullOrWhiteSpace($composeFile)) {
  $composeFile = Join-Path $root 'infra\docker-compose.local.yml'
}

function dc {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)
  docker compose -f $composeFile @Args
}

Write-Host "==> Starting postgres dependency..."
dc up -d postgres | Out-Host

Write-Host "==> Running auth prisma seed in Docker..."
dc run --rm --no-deps auth sh -c "npx prisma db seed" | Out-Host

Write-Host "Auth seed completed successfully."
