sequenceDiagram
  autonumber
  actor User as User / Script
  participant PS as PowerShell / CLI
  participant Demo as Pdfolio.Conversion.Library.Demo (Exe)
  participant CFG as Configuration (appsettings + env)
  participant Lib as Pdfolio.Conversion.Library
  participant Asp as Aspose.Total (engine)
  participant FS as File System

  User->>PS: Run demo command\n(e.g., dotnet run -- <input> [--output-near-source])
  PS->>Demo: args[] passed (inputPath, optional flags)

  Demo->>Demo: Parse args\n- inputPath\n- optional flags (e.g. output-near-source)
  Demo->>CFG: Load config\n(appsettings.json, env vars)
  CFG-->>Demo: Conversion settings\n(engine prefs, temp dirs, etc.)

  Demo->>FS: Read source document bytes\n(File.ReadAllBytes / Stream)
  FS-->>Demo: Source bytes / stream

  Demo->>Demo: Resolve output path\nDefault: bin/net8.0\nFlag: same folder as input

  Demo->>Lib: ConvertToPdf(inputBytes/stream, options)
  activate Lib
  Lib->>Lib: Validate inputs/options
  Lib->>Asp: Load license (once per process) + convert\n(format detection handled by Aspose)
  activate Asp
  Asp-->>Lib: PDF bytes / PDF stream
  deactivate Asp
  Lib-->>Demo: ConversionResult\n(success, pdfBytes, errors)
  deactivate Lib

  alt Success
    Demo->>FS: Write PDF to resolved output path
    FS-->>Demo: Write OK
    Demo-->>User: Print summary\n(input, output, engine, status)
  else Failure
    Demo-->>User: Print error report\n(reason, engine used, next steps)
  end
