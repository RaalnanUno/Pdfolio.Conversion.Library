#requires -version 5.1
$ErrorActionPreference = "Continue"

Set-Location -LiteralPath $PSScriptRoot

$log = Join-Path $PSScriptRoot "build-lib.log"

"=========================================" | Out-File -FilePath $log -Encoding utf8
"Pdfolio.Conversion.Library - Build"        | Out-File -FilePath $log -Encoding utf8 -Append
"Started: $(Get-Date -Format o)"            | Out-File -FilePath $log -Encoding utf8 -Append
"Working dir: $PSScriptRoot"                | Out-File -FilePath $log -Encoding utf8 -Append
"=========================================" | Out-File -FilePath $log -Encoding utf8 -Append

Write-Host "========================================="
Write-Host " Pdfolio.Conversion.Library"
Write-Host " Build"
Write-Host "========================================="
Write-Host "Script dir: $PSScriptRoot"
Write-Host "Logging to: $log"
Write-Host ""

function Run-Step([string]$label, [string[]]$cmd) {
  "---- $label ----" | Out-File -FilePath $log -Encoding utf8 -Append
  "Command: $($cmd -join ' ')" | Out-File -FilePath $log -Encoding utf8 -Append

  Write-Host ">> $label"
  & $cmd[0] @($cmd[1..($cmd.Length-1)]) 2>&1 | Tee-Object -FilePath $log -Append

  $rc = $LASTEXITCODE
  "ExitCode: $rc" | Out-File -FilePath $log -Encoding utf8 -Append
  "" | Out-File -FilePath $log -Encoding utf8 -Append

  return $rc
}

# dotnet check
$rc = Run-Step "dotnet --version" @("dotnet","--version")
if ($rc -ne 0) {
  Write-Host "ERROR: .NET SDK not found (exit $rc)."
  goto End
}

# restore
$rc = Run-Step "dotnet restore" @("dotnet","restore")
if ($rc -ne 0) {
  Write-Host "ERROR: dotnet restore failed (exit $rc)."
  goto End
}

# build
$rc = Run-Step "dotnet build" @("dotnet","build","-v:minimal")
if ($rc -ne 0) {
  Write-Host "ERROR: dotnet build failed (exit $rc)."
  goto End
}

Write-Host "=== Library build complete ==="
"Build succeeded." | Out-File -FilePath $log -Encoding utf8 -Append

:End
Write-Host ""
Write-Host "---- Tail of log (last 80 lines) ----"
Get-Content -Path $log -Tail 80 | ForEach-Object { Write-Host $_ }
Write-Host "-------------------------------------"
Write-Host "Log file: $log"
Write-Host ""
Read-Host "Press Enter to close"
exit $rc

# .\build-lib.ps1
# If policies block scripts:
# powershell -ExecutionPolicy Bypass -File .\build-lib.ps1
