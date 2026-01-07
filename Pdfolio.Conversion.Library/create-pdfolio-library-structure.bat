@echo off
setlocal enabledelayedexpansion

REM ==========================================================
REM Pdfolio.Conversion.Library - folder + file scaffold
REM Run this from the repo folder where you want the tree created.
REM ==========================================================

set "ROOT=Pdfolio.Conversion.Library"

echo Creating folders...
mkdir "%ROOT%" 2>nul

mkdir "%ROOT%\Abstractions" 2>nul
mkdir "%ROOT%\Models" 2>nul
mkdir "%ROOT%\Converters" 2>nul
mkdir "%ROOT%\Locators" 2>nul
mkdir "%ROOT%\Exceptions" 2>nul
mkdir "%ROOT%\Factory" 2>nul
mkdir "%ROOT%\Utility" 2>nul

echo Creating files...

REM Abstractions
type nul > "%ROOT%\Abstractions\IPdfConverter.cs"

REM Models
type nul > "%ROOT%\Models\ConversionRequest.cs"
type nul > "%ROOT%\Models\ConversionResult.cs"
type nul > "%ROOT%\Models\ConversionReport.cs"
type nul > "%ROOT%\Models\ConverterAttempt.cs"
type nul > "%ROOT%\Models\ConversionStep.cs"

REM Converters
type nul > "%ROOT%\Converters\AsposePdfConverter.cs"
type nul > "%ROOT%\Converters\LibreOfficeHeadlessPdfConverter.cs"
type nul > "%ROOT%\Converters\OpenOfficeHeadlessPdfConverter.cs"
type nul > "%ROOT%\Converters\ChainPdfConverter.cs"
type nul > "%ROOT%\Converters\FallbackPdfConverter.cs"
type nul > "%ROOT%\Converters\MissingBinaryGuardConverter.cs"

REM Locators
type nul > "%ROOT%\Locators\LibreOfficeLocator.cs"
type nul > "%ROOT%\Locators\OpenOfficeLocator.cs"

REM Exceptions
type nul > "%ROOT%\Exceptions\ConverterMissingException.cs"

REM Factory
type nul > "%ROOT%\Factory\PdfConverterFactory.cs"

REM Utility
type nul > "%ROOT%\Utility\Hashing.cs"

echo.
echo Done.
echo Created scaffold under: "%CD%\%ROOT%"
echo.

endlocal
