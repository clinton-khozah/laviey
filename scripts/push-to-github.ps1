# Run AFTER creating empty repo on GitHub:
#   https://github.com/clinton-khozah/laviey
#
# Do not initialize with README when creating (avoids merge conflicts).

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

git remote set-url origin https://clinton-khozah@github.com/clinton-khozah/laviey.git
git push -u origin development
git push -u origin testing
git push origin main

Write-Host ""
Write-Host "Frontend pushed. Open PRs:"
Write-Host "  development -> testing: https://github.com/clinton-khozah/laviey/compare/testing...development"
Write-Host "  testing -> main:        https://github.com/clinton-khozah/laviey/compare/main...testing"
