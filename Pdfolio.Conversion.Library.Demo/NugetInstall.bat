@echo off
echo === Restoring Pdfolio.Conversion.Library.Demo dependencies ===

dotnet add package Microsoft.Extensions.Configuration
dotnet add package Microsoft.Extensions.Configuration.Json
dotnet add package Microsoft.Extensions.Configuration.EnvironmentVariables

dotnet add package Microsoft.Extensions.DependencyInjection
dotnet add package Microsoft.Extensions.Logging
dotnet add package Microsoft.Extensions.Logging.Console

dotnet add package Microsoft.Data.Sqlite

dotnet add package Spectre.Console
dotnet add package Aspose.Total

dotnet restore
dotnet build

echo === Done ===
pause
