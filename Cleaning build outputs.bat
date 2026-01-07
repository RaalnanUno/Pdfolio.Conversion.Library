@echo off
echo === Cleaning build outputs ===

dotnet clean

rmdir /s /q .vs 2>nul
for /d /r %%d in (bin,obj) do @if exist "%%d" rmdir /s /q "%%d"

echo === Clearing NuGet caches ===
dotnet nuget locals all --clear

echo === Done cleaning ===
pause
