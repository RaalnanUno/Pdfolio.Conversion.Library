CREATE INDEX IF NOT EXISTS IX_FileArchive_PdfPending
ON FileArchive (PdfStatus, PdfConvertedUtc);
