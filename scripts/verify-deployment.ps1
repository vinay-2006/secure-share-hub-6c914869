param(
  [string]$SupabaseUrl = "https://qqhkuowjptgzftoztvda.supabase.co",
  [string]$ProjectRef = "qqhkuowjptgzftoztvda"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Check {
  param(
    [string]$Name,
    [bool]$Passed,
    [string]$Detail
  )

  if ($Passed) {
    Write-Host "[PASS] $Name - $Detail" -ForegroundColor Green
  }
  else {
    Write-Host "[FAIL] $Name - $Detail" -ForegroundColor Red
  }
}

function Invoke-JsonPost {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [hashtable]$Headers = @{},
    [hashtable]$Body = @{}
  )

  $json = $Body | ConvertTo-Json -Depth 8

  try {
    $response = Invoke-WebRequest -Method Post -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json
    return [PSCustomObject]@{
      StatusCode = [int]$response.StatusCode
      Body = $response.Content
    }
  }
  catch {
    if ($_.Exception.Response) {
      $statusCode = [int]$_.Exception.Response.StatusCode
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $responseBodyText = $reader.ReadToEnd()
      return [PSCustomObject]@{
        StatusCode = $statusCode
        Body = $responseBodyText
      }
    }

    throw
  }
}

Write-Host "VaultLink deployment smoke-check" -ForegroundColor Cyan
Write-Host "Project: $ProjectRef"
Write-Host "URL:     $SupabaseUrl"
Write-Host ""

try {
  $functionsList = supabase functions list --project-ref $ProjectRef 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Check -Name "Supabase CLI access" -Passed $true -Detail "functions list returned successfully"
    $functionsList | Write-Host
  }
  else {
    Write-Check -Name "Supabase CLI access" -Passed $false -Detail "functions list failed. Ensure supabase login and project access"
    $functionsList | Write-Host
  }
}
catch {
  Write-Check -Name "Supabase CLI access" -Passed $false -Detail $_.Exception.Message
}

Write-Host ""
Write-Host "Edge Function reachability checks (should not be 404 if deployed)" -ForegroundColor Cyan

$validateUrl = "$SupabaseUrl/functions/v1/validate-and-download"
$verifyUrl = "$SupabaseUrl/functions/v1/verify-file-password"
$adminDataUrl = "$SupabaseUrl/functions/v1/admin-panel-data"
$opsUrl = "$SupabaseUrl/functions/v1/ops-maintenance"

$r1 = Invoke-JsonPost -Url $validateUrl -Body @{}
Write-Check -Name "validate-and-download" -Passed ($r1.StatusCode -in @(200, 400, 401, 403, 409, 429)) -Detail "HTTP $($r1.StatusCode)"

$r2 = Invoke-JsonPost -Url $verifyUrl -Body @{}
Write-Check -Name "verify-file-password" -Passed ($r2.StatusCode -in @(200, 400, 401, 403, 429)) -Detail "HTTP $($r2.StatusCode)"

$r3 = Invoke-JsonPost -Url $adminDataUrl -Body @{}
Write-Check -Name "admin-panel-data" -Passed ($r3.StatusCode -in @(401, 403, 200)) -Detail "HTTP $($r3.StatusCode)"

$r4 = Invoke-JsonPost -Url $opsUrl -Body @{}
Write-Check -Name "ops-maintenance" -Passed ($r4.StatusCode -in @(401, 200)) -Detail "HTTP $($r4.StatusCode)"

Write-Host ""
Write-Host "Expected status guide:" -ForegroundColor Yellow
Write-Host "- validate-and-download: 200/403/404/409/429 are possible, but 404 means missing deployment"
Write-Host "- verify-file-password: 200/400/404/429 are possible, but endpoint itself should exist"
Write-Host "- admin-panel-data: 401/403 without bearer token is expected"
Write-Host "- ops-maintenance: 401 without X-Ops-Key is expected"

Write-Host ""
Write-Host "If any endpoint returns 404, deploy functions:" -ForegroundColor Yellow
Write-Host "supabase functions deploy --project-ref $ProjectRef"