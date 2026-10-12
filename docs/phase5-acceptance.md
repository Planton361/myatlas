# Phase 5 — Review-Abnahme

Ausgangsstände: MyAtlas `266c1195d5552753f3a63246ec1591ccc5c2b332`
(PR #8, Main-CI und Pages grün) und Hyperskill Projects
`5795c668c639e001fcef80c45f36794d0ca2a39b` (PR #12, Main-CI grün).
Indexvariablen waren nicht gesetzt; Source-/Release-Konfiguration bleibt deaktiviert.

Lokal tatsächlich geprüft, Python 3.12:

- 41 bestehende/neue Sync- und Aktivierungsprüfungen: statischer Übergang,
  echte Pointer-/Payload-Web-Crypto-Prüfung, Quellen-/Store-SHAs, unabhängige
  Validator-Revisionsbindung, defekte Herkunft, Netzwerk/Stale/Timeout-Blockierung.
- 45 Reader-Vertragstests mit drei Archivprojekten; zusätzlich dieselben 45 mit
  einem temporär versionierten vierten synthetischen Projekt 203. Beide grün.
- Companion Projects: 99 bisherige Importer-/Publisher-/Archiv-/Indextests,
  sieben Git-/Workflow-Policytests, zwei zusätzliche Datenfehlerprüfungen grün.
- 30 aufeinanderfolgende echte Importer-Aufrufe ausschließlich synthetischer
  Quellen, temporäres Git-Repository. Jeder Commit: komplette Archive, zwei
  bytegleiche Indexbuilds, unabhängiger Validator, Browser-Wirevertrag und
  akzeptierte Kataloganalytics. Exakt 3 → 33 Projekte, UNKNOWN/UNMAPPED ohne Topics,
  zwölf Verifikationen, keine Course-Abschlussdaten, keine Adapter-/CI-Anpassung.

Drei reale IDs bleiben 113/229/380, global 32 gelernt / 12 verifiziert.
Alle 22 Archivblob-Hashes wurden gegen den unveränderten Baselinevertrag geprüft.
SHA-256 der sortierten kompakten Hashmap plus LF:
`6045f7b64cb92af554f575bde4a346adeadbe5f7b384d7a2ab38a09f7c1e9bf2`.
Die gesamte semantische Projektion ohne `source`, kompakte sortierte JSON-Darstellung
**ohne** LF, behält `1a86243ba9c3581c709417281cd18498bb72b5b0bfc23a91baa6bcffa0086878`.

Vollständige lokale/CI-Pages-Abnahme und ihre Chromium-/WebKit-/Geometrieartefakte
werden im Draft-PR #9 mit Laufrevision und endgültigem Ergebnis verlinkt. Es
werden keine fehlgeschlagenen Prüfungen als bestanden gezählt. Der erste lokale
Versuch scheiterte an fehlendem `playwright-core` im kopierten Tooling; mit dem
passenden locked Paket wurde die volle Abnahme wiederholt. Der erste Projects-
CI-Lauf zeigte den oben dokumentierten Fixturefehler; die drei betroffenen
Offline-/Cache-/Cancel-Assertions sind weiterhin unverändert, die Eingaben korrigiert.
Die vollständige Baselineprojektion wird außerdem explizit an der unveränderlichen
`archive_commit`-Revision geprüft; die 22 aktuellen Archivhashes bleiben zusätzlich
Pflicht. Erweiterte Kandidaten behalten exakt die unabhängigen Verifikations-/Course-
Nachweise. Browser-Fallbackzahlen verwenden das vollständige Universalregister,
einschließlich UNMAPPED, nicht die kataloggebundene Teilmenge.

Keine Änderung an Katalog, Analytics, Reader-Runtime-Assets, historischen
Release-Manifesten, Fortschrittsdaten oder Projektarchiven. Keine produktive
Aktivierung, kein Deployment und kein Merge. Merge-Reihenfolge: #9 vor Projects #13.
Rollout/Fehlerbehandlung/Phase-6-Übergabe stehen im
[Datensync-Vertrag](contracts/hyperskill-project-data-ci-v1.md).

Die sechs Dynamic-Release-Tests bestehen mit frisch an die aktuelle Git-Revision
gebundenem Artefakt. Der Baseline-Test besteht zusätzlich nach drei aufeinanderfolgenden
temporären Erweiterungen (UNKNOWN 95, UNMAPPED 900000001, KNOWN 203).
Eine Prüfung gegen ein Artefakt älterer App-/Projekt-SHAs wurde erwartungsgemäß durch
`Public project progress mismatch` blockiert; nach Rebuild derselben geprüften
Revision sind auch Reversal und Geometrie-Manipulationsprüfung grün.

Die feste Reader-/Geometrie-Eingabe wird jetzt direkt durch den bestehenden
Git-Reader an `baseline.archive_commit` erzeugt, nicht aus Kandidatenzeilen
zusammengesetzt. Im Index-Browsertest wird zuerst der vollständige unveränderte
Kandidaten-Fallback einschließlich UNMAPPED geprüft. Anschließend startet die
lokale HTTP-Mocksequenz aus diesem validierten historischen statischen Snapshot,
wie die bestehende `geometry-browser.cjs`-Abnahme. Alle fünf festen Hashassertions
und die bytegleiche Geometrie bei späteren Indexupdates bleiben Pflicht.

Zusätzliche vollständige lokale Mockprüfung mit bereits **sechs** statischen
Kandidatenprojekten (KNOWN 203, UNKNOWN 95, UNMAPPED 900000001): sechs Release-
Tests, 45 Reader-Tests und Chromium/WebKit jeweils 1440/390 px grün. Der feste
Index-Fixture wächst danach ohne App-Build auf sieben Projekte und 33 gelernte
Topics, weiterhin zwölf Verifikationen und fünf unveränderte Baselinegeometrien.
Ein einzelner lokaler Navigation-Ready-Timeout im vorangegangenen Gesamtlauf
wurde als Browserfehler festgehalten; die separate vollständige Vier-Kontext-
Browserverifikation bestand unverändert, ohne Timeout-/Assertion-Abschwächung.
Die endgültigen Gesamt-CI-Läufe bleiben der verpflichtende Abschlussnachweis.
