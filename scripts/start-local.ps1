# Start Alyson AI frontend + backend locally (no Docker)
$root = Split-Path -Parent $PSScriptRoot

Write-Host "First time? Run: npm run setup:api" -ForegroundColor Yellow
Write-Host "Starting API + frontend..." -ForegroundColor Cyan

Push-Location $root
npm run dev:all
Pop-Location
