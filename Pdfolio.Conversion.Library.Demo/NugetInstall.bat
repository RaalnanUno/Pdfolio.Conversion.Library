@echo off
echo =========================================
echo  Pdfolio.Conversion.Library.Demo
echo  Minimal NuGet Install (net8)
echo =========================================

REM Config (only what the Demo csproj actually uses)
dotnet add package Microsoft.Extensions.Configuration --version 8.0.2
dotnet add package Microsoft.Extensions.Configuration.Binder --version 8.0.2
dotnet add package Microsoft.Extensions.Configuration.Json --version 8.0.2
dotnet add package Microsoft.Extensions.Configuration.EnvironmentVariables --version 8.0.2

dotnet restore
dotnet build

echo =========================================
echo  Done
echo =========================================
pause
