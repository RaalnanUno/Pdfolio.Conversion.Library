CREATE TABLE IF NOT EXISTS FileArchive (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,

  OriginalFullPath TEXT NULL,
  OriginalFileName TEXT NOT NULL,
  OriginalExtension TEXT NULL,
  ContentType TEXT NULL,

  FileSizeBytes INTEGER NOT NULL,
  FileCreatedUtc TEXT NULL,
  FileModifiedUtc TEXT NULL,

  Sha256 BLOB NULL,

  OriginalBlob BLOB NOT NULL,
  PdfBlob BLOB NULL,

  IngestedUtc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PdfConvertedUtc TEXT NULL,
  PdfStatus INTEGER NOT NULL DEFAULT 0,
  PdfError TEXT NULL,

  -- NEW FIELDS (if you added these)
  PdfConverterUsed TEXT NULL,
  PdfReportJson BLOB NULL,
  PdfErrorJson BLOB NULL
);
