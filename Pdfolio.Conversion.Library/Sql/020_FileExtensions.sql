CREATE TABLE IF NOT EXISTS FileExtensions
(
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    Extension       TEXT NOT NULL,
    ConversionCount INTEGER NOT NULL DEFAULT 0,
    FirstSeenUtc    TEXT NOT NULL,
    LastSeenUtc     TEXT NOT NULL,
    CONSTRAINT UX_FileExtensions_Extension UNIQUE (Extension)
);
