@echo off
echo =========================================
echo  Pdfolio.Conversion.Library.Demo
echo  NuGet Install (Pinned for .NET 8)
echo =========================================

REM ---- Configuration & Binding ----
dotnet add package Microsoft.Extensions.Configuration --version 8.0.2
dotnet add package Microsoft.Extensions.Configuration.Json --version 8.0.2
dotnet add package Microsoft.Extensions.Configuration.EnvironmentVariables --version 8.0.2
dotnet add package Microsoft.Extensions.Configuration.Binder --version 8.0.2

REM ---- Options / DI ----
dotnet add package Microsoft.Extensions.DependencyInjection --version 8.0.2
dotnet add package Microsoft.Extensions.Options.ConfigurationExtensions --version 8.0.2

REM ---- Logging ----
dotnet add package Microsoft.Extensions.Logging --version 8.0.2
dotnet add package Microsoft.Extensions.Logging.Console --version 8.0.2

REM ---- Data & UX ----
dotnet add package Microsoft.Data.Sqlite --version 8.0.8
dotnet add package Spectre.Console --version 0.49.1

REM ---- Document Conversion ----
dotnet add package Aspose.Total

REM ---- Restore & Build ----
dotnet restore
dotnet build

echo =========================================
echo  Demo NuGet install complete
echo =========================================
pause
