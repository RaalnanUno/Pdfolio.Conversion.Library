@echo off
setlocal

echo =========================================
echo  Pdfolio.Conversion.Library
echo  Build
echo =========================================

dotnet --version >nul 2>&1
if errorlevel 1 (
  echo ERROR: .NET SDK not found.
  exit /b 1
)

dotnet restore
if errorlevel 1 exit /b 1

dotnet build
if errorlevel 1 exit /b 1

echo === Library build complete ===
endlocal
pause
