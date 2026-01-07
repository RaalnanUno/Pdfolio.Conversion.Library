@echo off
setlocal

echo =========================================
echo  Pdfolio.Conversion.Library.Demo
echo  Build and Run
echo =========================================

REM Fail fast if dotnet is missing
dotnet --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: .NET SDK not found.
    exit /b 1
)

REM Clean build artifacts (optional but recommended for demos)
dotnet clean

REM Restore & build
dotnet restore
if errorlevel 1 exit /b 1

dotnet build
if errorlevel 1 exit /b 1

REM Run the demo
dotnet run

echo =========================================
echo  Application exited normally
echo =========================================

endlocal
pause
