cd "Pdfolio.Conversion.Library"

dotnet clean
dotnet restore
dotnet build

cd "../Pdfolio.Conversion.Library.Demo"

dotnet clean
dotnet restore
dotnet build

cd "bin\Debug\net8.0"

.\Pdfolio.Conversion.Library.Demo.exe "../../../../PDFolio.TestFiles/Alpha.doc"

