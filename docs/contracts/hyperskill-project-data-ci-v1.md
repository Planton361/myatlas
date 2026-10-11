# Hyperskill-Datensync — Phase 5

Der Schema-1-Index, Schema-4-Archivvertrag und Phase-4-Browserreader bleiben
unverändert. Dies ist ein Betriebsvertrag, kein neuer Index oder Fortschrittsaggregator.

Der öffentliche Reader bleibt deaktiviert (`config.json.enabled: false` und
reviewtes Release-Manifest `production_enabled: false`). Weder Merge noch
Umgebungsvariablen aktivieren ihn. Alle bestehenden MyAtlas-Push-/PR-/manuellen
Build-, Release-, Chromium-/WebKit- und Geometrie-Gates bleiben unverändert.

Im Projektarchiv unterscheidet die konservative Git-Policy neue Schema-4-
Archive (A), Infrastruktur/Altbestand/unbekannte Änderungen (B), manuelle und
regelmäßige vollständige Gesundheitschecks (C). A validiert den ganzen Commit,
Index-Reproduzierbarkeit, unabhängigen Inventarvalidator, echten Browservertrag,
Katalogbindung und unveränderte Verifikations-/Course-Semantik. B/C verlangen
zusätzlich die vollständige Cross-Repository-/Browser-/Release-/Geometrieabnahme.
Ein LeetCode-Netzwerkfehler wird als Anwendungsfehler gemeldet, nicht als
Archivfehler. Kein Projektcode wird ausgeführt.

## Übergangsentscheidung beim täglichen MyAtlas-Sync

1. Die vorhandene Git-basierte Archivprojektion validiert die exakte kanonische
   Projektrevision immer zuerst. Ungültige Evidenz blockiert.
2. Push, PR und manuelle Läufe bleiben vollständige Anwendungsabnahmen.
3. Ohne bewiesene Aktivierung gilt die bisherige statische Entscheidung: Nur
   wenn ausgelieferte und aktuelle kanonische App-/Projektrevisionen identisch
   sind, darf der Build entfallen. Neue Archivdaten erhalten weiterhin den
   vollständigen statischen Sync. Fehlende Herkunft erzwingt volle Abnahme.
4. Dynamischer Betrieb ist erst bewiesen, wenn ausgelieferte App und lokales
   kanonisches Main identisch sind, die **committete** Konfiguration aktiviert
   ist, das committete reviewte Release Aktivierung erlaubt und die ausgelieferte
   Runtime diese Release-SHA sowie die bytegleiche Konfiguration inventarisiert.
5. Nur dann anonym den festen HTTPS-Pointer und seinen unveränderlichen
   Raw-GitHub-Payload abrufen: keine Redirects, Cookies oder fremde URLs,
   4 KiB/16 MiB, 15 Sekunden HTTP-Timeout. Derselbe Phase-4-Reader prüft kanonische
   JSON-Bytes, exakt fünf Pointerfelder, getrennte Quell-/Store-SHAs, Web-Crypto-
   SHA-256, Identitäten und Inventare. Der bestehende unabhängige Git-Indexvalidator
   prüft zusätzlich vollständige echte Blobs der fixierten Projektrevision.
6. Nur ein gültiger Index des aktuell geprüften kanonischen Projektcommits erlaubt
   `mode: dynamic`, `build: false`. Der Bericht nennt Revision, Digest und Store-SHA.
   Keine App-Datei, Evidenz oder öffentlicher Pointer wird dabei geschrieben.
7. Fehlender, beschädigter oder verzögerter Index im bewiesen aktivierten Betrieb
   meldet **blocked**, niemals erfolgreichen unveränderten/leereren Stand.
   Last-known-good bleibt im Browser und öffentlich erhalten. Producer prüfen und
   wiederholen; ein App-Rebuild repariert keinen beschädigten Producer-Index.

Der Browser ersetzt den gesamten externen Projektstand nach vollständiger
Validierung atomar; `hyperskill:<ID>` zählt genau einmal. Mapping erfolgt nur über
den gebundenen vertrauenswürdigen Katalog; UNMAPPED bleibt Portfolio, nicht Scope.
Die bestehenden Cache-, Timeout- und verspätete-Antwort-Regeln bleiben unverändert.

## Review und Phase 6

Die volle Matrix hat einen Phase-4-Testfixturefehler aufgedeckt: Reader-Unit-
Fallbacks übernahmen bereits zusätzliche synthetische Kandidatenabschlüsse,
obwohl der feste Wire-Fixture bei drei Archiven beginnt. Die Testhilfe trennt
jetzt den festen, weiterhin auf 113/229/380, 32/12 geprüften Reader-Stand von der
vollständigen Kandidatenprojektion. Browser-Fallbacks müssen exakt zum gebauten
Kandidaten passen; keine Sicherheits-/Baseline-Assertion entfällt.

Daher **MyAtlas Draft-PR #9 zuerst**, anschließend Projects Draft-PR #13.
Nur die Projects-PR-Matrix darf den explizit gepinnten MyAtlas-Review-Commit
verwenden; Main/Health-Läufe verlangen dessen Merge in kanonisches Main.
Der schnelle Datenvertrag verwendet bereits gemergte Phase-4-Reader-Assets.
Die bestehende statische Synchronisierung bleibt währenddessen aktiv.

Phase 6 prüft Branchschutz (stabiler `Project acceptance`-Abschlusscheck statt
unbedingt erforderlicher einzeln übersprungener Browsermatrix), vollständige
End-to-End-Abnahme, versionierte Aktivierung mit bestehenden Release-Guards,
separat freigegebenen Producer-Bootstrap, erreichbaren Pointer samt vollständigem
Digest und Store-Historie. Erst danach öffentliche Reader-Aktivierung freigeben.
Diese Phase setzt keine GitHub-Variablen, deployed nicht und merged nicht.

Bei Netzwerkausfall Diagnose aus `project-sync-report.json` lesen. Ein statischer
Vergleichsfehler fordert den vollständigen Build; ein bewiesener dynamischer
Indexfehler stoppt den Sync mit erhaltenem gültigen Stand. Manueller Pages-Lauf
bleibt jederzeit eine vollständige Gesundheitsabnahme, kein Sicherheits-Bypass.
