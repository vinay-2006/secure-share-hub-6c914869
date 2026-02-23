param(
  [Parameter(Mandatory = $true)]
  [string]$AdminUserId,
  [string]$ProjectRef = "qqhkuowjptgzftoztvda"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($AdminUserId)) {
  throw "AdminUserId cannot be empty."
}

Write-Host "Setting ADMIN_USER_IDS for project $ProjectRef ..." -ForegroundColor Cyan
supabase secrets set --project-ref $ProjectRef "ADMIN_USER_IDS=$AdminUserId"

if ($LASTEXITCODE -ne 0) {
  throw "Failed to set ADMIN_USER_IDS secret."
}

Write-Host "ADMIN_USER_IDS updated successfully." -ForegroundColor Green