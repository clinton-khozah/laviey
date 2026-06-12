# Run AFTER creating empty repos on GitHub:
#   https://github.com/clinton-khozah/laviey_frontend
#   https://github.com/clinton-khozah/laviey
#
# Do not initialize with README when creating (avoids merge conflicts).

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

git remote set-url origin https://github.com/clinton-khozah/laviey_frontend.git
git push -u origin development
git push -u origin testing
git push origin main

Write-Host ""
Write-Host "Frontend pushed. Open PRs:"
Write-Host "  development -> testing: https://github.com/clinton-khozah/laviey_frontend/compare/testing...development"
Write-Host "  testing -> main:        https://github.com/clinton-khozah/laviey_frontend/compare/main...testing"
