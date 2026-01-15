@echo off
setlocal EnableExtensions

REM Always run from this script’s folder
cd /d "%~dp0"

set LOG=build-demo.log

echo =========================================
echo  Pdfolio.Conversion.Library.Demo
echo  Build
echo =========================================
echo Script dir: %CD%
echo Logging to: %LOG%
echo.

REM Start fresh log
echo ========================================= > "%LOG%"
echo Build started: %DATE% %TIME%>> "%LOG%"
echo Working dir: %CD%>> "%LOG%"
echo =========================================>> "%LOG%"

dotnet --version >> "%LOG%" 2>&1
if errorlevel 1 (
  echo ERROR: .NET SDK not found.>> "%LOG%"
  echo ERROR: .NET SDK not found.
  goto :showlog
)

echo --- dotnet restore --- >> "%LOG%"
dotnet restore >> "%LOG%" 2>&1
set RESTORE_RC=%ERRORLEVEL%
echo Restore exit code: %RESTORE_RC%>> "%LOG%"
if not "%RESTORE_RC%"=="0" (
  echo ERROR: dotnet restore failed (exit %RESTORE_RC%).>> "%LOG%"
  echo ERROR: dotnet restore failed (exit %RESTORE_RC%). See %LOG%
  goto :showlog
)

echo --- dotnet build --- >> "%LOG%"
dotnet build -v:minimal >> "%LOG%" 2>&1
set BUILD_RC=%ERRORLEVEL%
echo Build exit code: %BUILD_RC%>> "%LOG%"
if not "%BUILD_RC%"=="0" (
  echo ERROR: dotnet build failed (exit %BUILD_RC%).>> "%LOG%"
  echo ERROR: dotnet build failed (exit %BUILD_RC%). See %LOG%
  goto :showlog
)

echo === Demo build complete ===
echo Build succeeded.>> "%LOG%"

:showlog
echo.
echo ---- Tail of %LOG% (last 80 lines) ----
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%LOG%' -Tail 80"
echo --------------------------------------
echo Log file path: %CD%\%LOG%
echo.
pause
endlocal
exit /b %BUILD_RC%
