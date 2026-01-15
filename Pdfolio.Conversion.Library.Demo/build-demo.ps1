#requires -version 5.1
$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

$log = Join-Path $PSScriptRoot "build-demo.log"

function Write-Log([string]$line) {
  $line | Out-File -FilePath $log -Encoding utf8 -Append
}

function Run-Step([string]$label, [string[]]$cmd) {
  Write-Host ">> $label"
  Write-Log "---- $label ----"
  Write-Log ("Command: " + ($cmd -join " "))

  $output = & $cmd[0] @($cmd[1..($cmd.Length-1)]) 2>&1
  $output | Tee-Object -FilePath $log -Append | Out-Host

  $rc = $LASTEXITCODE
  Write-Log ("ExitCode: $rc")
  Write-Log ""
  return $rc
}

# Fresh log
"=========================================" | Out-File -FilePath $log -Encoding utf8
"Pdfolio.Conversion.Library.Demo - Build"   | Out-File -FilePath $log -Encoding utf8 -Append
"Started: $(Get-Date -Format o)"            | Out-File -FilePath $log -Encoding utf8 -Append
"Working dir: $PSScriptRoot"                | Out-File -FilePath $log -Encoding utf8 -Append
"=========================================" | Out-File -FilePath $log -Encoding utf8 -Append

Write-Host "========================================="
Write-Host " Pdfolio.Conversion.Library.Demo"
Write-Host " Build"
Write-Host "========================================="
Write-Host "Script dir: $PSScriptRoot"
Write-Host "Logging to: $log"
Write-Host ""

$rc = 0
try {
  $rc = Run-Step "dotnet --version" @("dotnet","--version")
  if ($rc -ne 0) { throw "dotnet not available (exit $rc)" }

  $rc = Run-Step "dotnet restore" @("dotnet","restore")
  if ($rc -ne 0) { throw "dotnet restore failed (exit $rc)" }

  $rc = Run-Step "dotnet build" @("dotnet","build","-v:minimal")
  if ($rc -ne 0) { throw "dotnet build failed (exit $rc)" }

  Write-Host "=== Demo build complete ==="
  Write-Log "Build succeeded."
}
catch {
  Write-Host "ERROR: $($_.Exception.Message)"
  Write-Log ("ERROR: " + $_.Exception.Message)
}
finally {
  Write-Host ""
  Write-Host "---- Tail of log (last 80 lines) ----"
  Get-Content -Path $log -Tail 80 | ForEach-Object { Write-Host $_ }
  Write-Host "-------------------------------------"
  Write-Host "Log file: $log"
  Write-Host ""
  Read-Host "Press Enter to close"
}

exit $rc


# .\build-demo.ps1
# If script execution is restricted:
# powershell -ExecutionPolicy Bypass -File .\build-demo.ps1
