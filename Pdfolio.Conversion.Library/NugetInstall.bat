@echo off
echo === Pdfolio.Conversion.Library – Aspose Consolidation ===

dotnet remove package Aspose.Words
dotnet remove package Aspose.Cells
dotnet remove package Aspose.Slides
dotnet remove package Aspose.Slides.NET
dotnet remove package Aspose.Slides.NET6.CrossPlatform

dotnet add package Aspose.Total

dotnet restore
dotnet build

echo === Library build complete ===
pause
