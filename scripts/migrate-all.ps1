$ErrorActionPreference = 'Stop'

# Runs Prisma migrations INSIDE Docker containers (no host node_modules required).
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$composeFile = $env:COMPOSE_FILE
if ([string]::IsNullOrWhiteSpace($composeFile)) {
  $composeFile = Join-Path $root 'infra\docker-compose.local.yml'
}

function dc {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)
  docker compose -f $composeFile @Args
}

Write-Host "==> Starting dependencies (postgres, redis, minio)..."
dc up -d postgres redis minio | Out-Host

Write-Host "==> Waiting for postgres to be ready..."
$pgUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { 'zippy' }
$pgDb   = if ($env:POSTGRES_DB)   { $env:POSTGRES_DB }   else { 'zippy' }

while ($true) {
  try {
    dc exec -T postgres pg_isready -U $pgUser -d $pgDb | Out-Null
    break
  } catch {
    Start-Sleep -Seconds 1
  }
}

$services = @('auth', 'ride', 'driver', 'payment')
foreach ($service in $services) {
  Write-Host "==> [$service] prisma migrate deploy + generate"
  dc run --rm --no-deps $service sh -c "npx prisma migrate deploy && npx prisma generate" | Out-Host
}

Write-Host "All Prisma migrations and client generations completed successfully."
