# Hyperskill source-only archive evidence

MyAtlas accepts the published legacy schema-2 exports and the current schema-3
source-only archives. Schema 2 remains subject to its historic standalone build
manifest checks. Schema 3 records an owner-attested completion and the exact
hashes of archived files; it makes no claim that the project builds or runs.

A schema-3 project lives under `java/<project>/` or `python/<project>/` and has
this manifest shape:

```json
{
  "schema": 3,
  "mode": "source-only",
  "language": "java",
  "directory_name": "Example Project",
  "project_id": 123,
  "completion": {
    "project_id": 123,
    "status": "completed",
    "attested_by": "owner",
    "observed_at": "2026-10-10T11:45:17Z"
  },
  "files": {
    "src/main/java/Main.java": "<64 lowercase hexadecimal SHA-256 characters>"
  }
}
```

The manifest and a short `README.md` are the only un-hashed project files.
Every other committed project file must appear in `files`, and every listed
path must resolve to a regular file whose bytes match its digest. Java archives
contain `.java` files; Python archives contain `.py` files. Both may include
only explicitly archived `.txt`, `.json`, or `.csv` text resources under `src/`.
Paths must remain below `src/`, contain no hidden components, and use the
language-specific source extension for code. Symlinks, build configuration,
IDE metadata, generated files, and unlisted files are rejected.

Completion counts as project completion even when the project is not
independently executable. Topic IDs are derived only from the versioned trusted
Atlas catalog. A project in `UNKNOWN` state contributes no learned Topics based
on its title, README, source code, or manifest.
