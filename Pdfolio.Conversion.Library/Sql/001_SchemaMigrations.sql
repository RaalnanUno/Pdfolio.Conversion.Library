CREATE TABLE IF NOT EXISTS SchemaMigrations (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  ScriptName TEXT NOT NULL UNIQUE,
  AppliedUtc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
