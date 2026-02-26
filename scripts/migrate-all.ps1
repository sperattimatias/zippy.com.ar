$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$services = @('auth', 'ride', 'driver', 'payment')

foreach ($service in $services) {
  $servicePath = Join-Path $root "services/$service"
  Write-Host "==> [$service] npx prisma migrate deploy"
  Push-Location $servicePath
  try {
    npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw "Migration failed for $service" }

    Write-Host "==> [$service] npx prisma generate"
    npx prisma generate
    if ($LASTEXITCODE -ne 0) { throw "Generate failed for $service" }
  }
  finally {
    Pop-Location
  }
}

Write-Host 'All Prisma migrations and client generations completed successfully.'
