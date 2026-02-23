param(
  [Parameter(Mandatory = $true)]
  [string]$OpsKey,
  [string]$SupabaseUrl = "https://qqhkuowjptgzftoztvda.supabase.co"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$headers = @{
  "X-Ops-Key" = $OpsKey
  "Content-Type" = "application/json"
}

try {
  $response = Invoke-RestMethod -Method Post -Uri "$SupabaseUrl/functions/v1/ops-maintenance" -Headers $headers -Body "{}"
  Write-Host "Ops maintenance executed successfully." -ForegroundColor Green
  $response | ConvertTo-Json -Depth 10
}
catch {
  if ($_.Exception.Response) {
    $status = [int]$_.Exception.Response.StatusCode
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $body = $reader.ReadToEnd()
    Write-Host "Ops maintenance failed with HTTP $status" -ForegroundColor Red
    Write-Output $body
    exit 1
  }

  throw
}