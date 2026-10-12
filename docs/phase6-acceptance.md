# Phase 6 — Abschlussabnahme und gesperrter Aktivierungs-Draft

Geprüfter kanonischer Ausgangsstand: MyAtlas
`12377e3fac28817adcbdf2fca846828763c0dc99` (#9, Merge 11:07:04 UTC), Projects
`e26dea5ff43d0f4404cbab4b25f60850b5d6cb8c` (#13, Merge 11:35:11 UTC),
12. Oktober 2026. Main-CI und MyAtlas Pages waren erfolgreich:
[Read-only](https://github.com/Planton361/myatlas/actions/runs/38240595021),
[Pages](https://github.com/Planton361/myatlas/actions/runs/38240595010),
[Projects Integration](https://github.com/Planton361/hyperskill-projects/actions/runs/38243602969).
Separate neue Worktrees; ursprüngliche lokale Working Trees unverändert.

## Implementierung und überprüfbare Freigabe

`docs/releases/myatlas-hyperskill-index-v1.json` und die sechs bisherigen
Reader-Supplement-Assets bleiben bytegleich. Der separate, exakt SHA-256-gepinnte
Aktivierungsvertrag ist `docs/releases/myatlas-hyperskill-index-activation-v1.json`.
Er erlaubt nur die Änderung **enabled false → true** in einer eigenen
Configquelle. Historischer Katalog-/Scope-Digest bleibt derselbe; Code, Topics,
Atlaspositionen, Packing und ursprüngliche Lernnachweise ändern sich nicht.

Das neue Release baut ausschließlich im Review-Artefakt die aktive Config ein.
Es inventarisiert sie samt neuem Manifest im Runtime-Nachweis und kehrt das
Supplement für alle vorhandenen V6.6-, Navigation-, externe Evidenz- und
Präsentationsprüfungen vollständig zurück. Uncommittete Flags, nicht reguläre
Git-Objekte, Symlinkquellen und unreviewte Manifeste bleiben verboten.
Eine nicht committete Entfernung der Freigabe wird ebenfalls abgewiesen.

**Dieser Draft aktiviert weder öffentliche Config noch Repositoryvariablen.**
Der neue read-only Job `activation-check` blockiert, bis der echte Producerindex
anonym aus der öffentlichen MyAtlas-Origin in beiden Browsern geprüft wurde.
Der bestehende Deploy-Job verlangt sowohl den vollständigen `build` als auch
`activation-check`. Die alten Build-/Production-SHA-Guards bleiben erhalten.
Alle Builds in dieser Abnahme sind isolierte lokale/PR-Artefakte, kein Deployment.
Der PR bleibt Draft und ungemergt, auch wenn später alle Checks grün werden,
bis der Eigentümer die Aktivierung ausdrücklich freigibt.

## Tatsächliche öffentliche Endpoint-Beobachtung

```bash
python3.12 -B scripts/check-public-project-index.py \
  --evidence-root /isoliert/hyperskill-projects --allow-missing
```

Read-only Beobachtung am 12. Oktober 2026: Python und **Chromium + WebKit aus
`https://planton361.github.io/myatlas/knowledge-map/`** erhalten Pointer HTTP 404.
[Maschinenlesbarer Bericht](acceptance/phase6-public-index-smoke.json).
Die anonyme Pointeranforderung wurde tatsächlich beobachtet; keine Credentials,
Cookie-/Authorization-Header, Route-Mocks oder eigenen Fakeendpunkte. Der Pointer
liegt auf derselben Origin wie MyAtlas; die spätere Raw-GitHub-Payloadanforderung
ist der separat zu belegende Cross-Origin-Fetch. **Raw-GitHub-CORS ist noch nicht
PRODUCTION_VERIFIED**, weil kein gültiger Pointer/Payload existiert.

Für die Freigabe denselben Test **ohne `--allow-missing`**, zunächst mit
`--expect-revision <aktuelles Projects Main>` und Standard-IDs 113/229/380
wiederholen. `--expect-current` erzeugt für spätere normale Datenänderungen den
vollständigen erwarteten ID-Bestand aus dem kanonisch ausgecheckten Commit;
keine dauerhafte Drei-Projekte-Grenze im Aktivierungscheck.

Der echte Smoke akzeptiert keine benutzerdefinierten URLs oder Zugangsdaten.
Er verwendet den vorhandenen Browser-Wire-Vertrag und Web Crypto; unabhängige
Git-Inventarvalidierung prüft zusätzlich Hashes, Rollen, Git-Blobs und Code-Links.
Browser/Python müssen exakt dieselben kanonischen Bytes sehen; Änderung zwischen
Abrufen erfordert einen vollständigen neuen Versuch. Source- und Store-SHA
müssen verschieden sein. `--allow-missing` ist ausschließlich eine Vorabbeobachtung
und wird niemals im Aktivierungsgate verwendet.

## Abnahmematrix und Baseline

| Status | Bedeutung in dieser Abnahme |
| --- | --- |
| IMPLEMENTED | Universeller Producer, Schema-1-Index/Store, sicherer Reader, bestehende Class-A/B/C-CI; gepinnter Aktivierungs-/Rollbackvertrag und echtes Smoke-Gate |
| TESTED | Synthetische Archiv-/Wire-/Browser-/Cache-/Race-/Rollback-/Recovery-Tests; 30 sequenzielle Imports in temporären Git-Repositories; vollständiger Review-Build |
| PRODUCTION_VERIFIED | Gemergte Main-CI/öffentliche Pages; echter anonymer Pointer-404 aus beiden Browsern |
| BLOCKED | Erster öffentlicher Index, Raw-GitHub-CORS und aktive öffentliche Darstellung vor separatem Bootstrap und Ownerfreigabe; Branchschutzadministration |

Reale IDs bleiben 113,229,380; global 32 gelernt, 12 unabhängig verifiziert;
Course-Records leer. Alle 22 Archivhashes werden aus den exakten Git-Blobs gegen
[Baseline v1](contracts/hyperskill-baseline-v1.json) geprüft. Unabhängige Topic-IDs
und fünf Fingerprints bleiben exakt gleich. Vollständiges Inventar samt Blob-IDs
und originalen Attestationen ist im Producer-Preflight enthalten.
Die unveränderte Hashmap hat SHA-256
`6045f7b64cb92af554f575bde4a346adeadbe5f7b384d7a2ab38a09f7c1e9bf2`
(kompakte sortierte JSON-Schlüssel + LF); die Fortschrittssemantik ohne `source`
hat `1a86243ba9c3581c709417281cd18498bb72b5b0bfc23a91baa6bcffa0086878`.

Fünf Geometriewerte:

```text
global      1306993ec8a1b7a80edda4f620fb96ba5d4803c0d81ded334b92efa85cdf1174
personal    a60fc22e272079c91f39cfed9c01af5865bae29120e6d6f7801b02da96cd6348
course8     ab8e05971ca8fb9d077b491a766554f5b84118e068433afe4c17faa7e91fb89b
project113  33dc51873bcbd33fa6ad2de854dd719e525706bdb764a50578570d1f73e89034
stage617    24edf473c9e97b7ccbb287464302a4bbf6ffadff33efdc265076b5ae6b51455e
```

Bereits bestandene lokale Python-3.12-Abnahme: **113 Producer-Tests** mit
`MYATLAS_ROOT`, einschließlich 30 Imports (33 Projekte am Ende, 12 verifiziert,
keine Course-Records); **41 Sync-/Smoke-/Aktivierungs-Tests**, ergänzt um den
neuen strengen CPU-Navigationsvertrag. Kein importierter Code wurde ausgeführt.

Prüfkommandos:

```bash
HYPERSKILL_EVIDENCE_ROOT=/isoliert/projects python3.12 -B -m unittest \
  scripts.tests.test_index_sync scripts.tests.test_public_index_smoke \
  scripts.tests.test_activation_release
python3.12 -B scripts/validate-pages-candidate.py --evidence-root /isoliert/projects
GITHUB_REF=refs/heads/main GITHUB_SHA="<exakter Review-App-Commit>" \
  python3.12 -B scripts/validate-pages-candidate.py --evidence-root /isoliert/projects
```

Der vollständige Kandidatenlauf enthält vorhandene Archiv-/Release-Tests,
45 Reader-Vertragstests, Presentation-/Dynamic-Release-Tests, Chromium/WebKit
auf Desktop/mobile, die fünf geometrischen Scopes sowie komplette LeetCode-
Browserabnahme. Indexbrowser-Fixtures ersetzen Daten mehrfach **ohne erneuten
App-Build**, prüfen identische und wachsende Register, UNKNOWN/UNMAPPED,
vollständige Deduplizierung, sicheren DOM-Text, Code-Links, Cache-LKG und atomare
Übernahme; Verifikationen/Courses bleiben gleich. Storetests im Producer prüfen
unterbrochene/konkurrierende Publikationen und echte lokale alte immutable URLs.

Die erneute read-only **Class-C-Gesundheitsprüfung** läuft auf GitHub:
[Run 38247080718](https://github.com/Planton361/hyperskill-projects/actions/runs/38247080718).
Dort laufen die unveränderten sechs vollständigen Kompatibilitätsszenarien und
30 lokale synthetische Imports innerhalb eines echten Ubuntu-GitHub-Jobs.
Der echte öffentliche Class-A-PR-/Matrix-Skip wurde bewusst nicht durch einen
Fakeabschluss ausgelöst. PR-/Main-Diff-, Klassifizierungs- und schnelle
Archiv/Index/Reader-Prüfungen werden mit versionierten temporären Fixtures
geprüft; die tatsächliche Skipentscheidung folgt den überprüften Workflowguards.
Diese Grenze darf nicht als öffentlich durchlaufener Class-A-Projekt-PR ausgegeben werden.

Der aktivierte Kandidat deckte zusätzlich eine bisher nicht erreichte Browser-
Fixturegrenze auf: LeetCode-Top-UI navigiert in den Atlas und lehnt dessen neuen
Hyperskill-Pointer als unerwartete Netzadresse ab. Die Fixture isoliert jetzt
ausschließlich den festen Pointer mit einem ungültigen kanonischen JSON-Objekt
und prüft GET/fehlende Credentials. Die Wirevalidierung muss es ablehnen und
den statischen Fallback erhalten.
Die strenge Sperre aller anderen externen URLs bleibt unverändert; echte
Index-/CORS-Abnahme bleibt der separate ungemockte Smoke, vollständiges Wachstum
die bestehende Indexbrowser-Suite. Damit bleibt die Top-UI-Projektion konsistent
mit ihrem geprüften statischen Snapshot auch nach der späteren Aktivierung.
Beim aktiven Overlay können abgebrochene alte Workerladungen `networkidle`
blockieren. Der Navigationstest wartet daher auf das tatsächliche fertige Modell,
Fontstatus, Worker-Ready und identische vollständige Shell-/Frame-Snapshots,
anstatt den verworfenen Worker als Bereitschaftskriterium zu benutzen. Alle
zwölf Chromium/WebKit-Top-UI-Kombinationen bestanden diesen gezielten Test.

Ein Zwischenlauf wurde korrekt von der Source-Provenienz blockiert, weil der
Releasevalidator während des laufenden Tests noch uncommittete Verbesserungen
enthielt. Ursache war Test-/Edit-Parallelität, keine abgeschwächte Assertion;
der komplette Lauf wird für den committeten endgültigen Kandidaten wiederholt.
Ein erster Producer-Unittest-Aufruf ohne `MYATLAS_ROOT` scheiterte erwartbar am
verbindlichen Reader-Paritätsnachweis; der vollständige Lauf setzt den exakten
isolierten MyAtlas-Checkout. Terminale CI-Status und neue Review-SHAs gehören
zum finalen PR-Bericht, nicht zu einer vorab erfundenen Freigabe.

## Branchschutz und verbleibende Risiken

Beide `main`-Branches: REST 404 `Branch not protected`, leere wirksame Regeln
und Rulesets. Vorhandene Adminrechte ändern nichts an der fehlenden ausdrücklichen
Administrationsfreigabe. Keine Einstellung wurde geändert. Nach Zustimmung
Settings → Rules → Rulesets: PR-Pflicht, keine Bypasses, aktuelle Branchbasis,
Force-Push/Löschen sperren. Projects Required Checks: `Project acceptance`,
`check`, `build`; MyAtlas: `check`, `project-check`, `build`, `activation-check`.
Herkunft GitHub Actions, App-ID 15368. Die Workflowqualifizierung in der UI
unterscheidet die ansonsten kurzen REST-Jobnamen. Einzelne übersprungene
Matrixjobs nicht zwingend eintragen. Store-Regel exakt `portfolio-index-store`:
Löschen/Force-Push verbieten, normalen bestehenden Bot-Fast-forward erlauben.
Vollständige UI-Schritte und Quellen stehen im Producer-Rolloutleitfaden.

Netzwerk/LeetCode/Pages/CDN können eine Anwendungsabnahme blockieren. Digest-
Übereinstimmung belegt nur Pointerbindung; Herkunft bleibt an den festen
HTTPS-Endpunkt, Repositoryschutz und geprüften Producer gebunden. Cachezugriff
kann fehlen und LocalStorage ist keine vertrauenswürdige Quelle: erneute
vollständige Pairvalidierung ist Pflicht. SHA-Werte liefern keine zeitliche
Ordnung; Anfragegenerationen schützen vor verspäteten Antworten, Producer-SHA-
und Storeguards vor überholten Veröffentlichungen. Keine globale CDN-Atomizität.

## Freigabe, Normalbetrieb, Rollback

Zuerst den Producer-Preflight-PR reviewen und manuell mergen. Aktuelles Main
neu fixieren und dessen Preflight wiederholen. Dann **separate** Freigabe für
Producer Enabled + einmaligen Bootstrap, vorhandenen Pages-Workflow, tatsächliche
Store-/HTTPS-/Digest-/Pointerprüfung; Bootstrap anschließend deaktivieren.
Erst nach echten erfolgreichen Chromium/WebKit-CORS-Prüfungen diesen Draft
neu abnehmen und separate Reader-Merge-/Deploymentfreigabe einholen.

Die erste aktive Seite muss exakt drei Projekte, korrekte Code-Links, 32/12,
leere Course-Records und die fünf Fingerprints zeigen. Unverändertes Refresh
ändert keine Zahlen; ungültiger Index behält LKG samt Stale-Status. Erst ein
zukünftiger **echter** vierter Abschluss darf den Klasse-A-Datenpfad auslösen.
Vor Aktivierung bleibt statischer Sync; nach belegter Aktivierung und gesundem
Index überspringt der bestehende tägliche Sync den App-Build. Kein erfundener
vierter Abschluss und keine COMPLETE-/PUBLISH-Automatisierung.

Rollback ist ein reviewed Release-PR, der die additive Aktivierungsmanifestdatei
entfernt und alle Gates erneut durchläuft. Der unveränderte ursprüngliche
Config/Release-Nachweis wird dann wieder verwendet; statischer Sync arbeitet
weiter. Die synthetischen Rollbacktests erzeugen diese Git-Revision tatsächlich.
Kein Store-Reset, kein Producer-Disable mit bestehendem Store, kein leerer Pointer.
Store-Recovery bleibt ausschließlich der bestehende, persönlich geprüfte
`recovery_pointer`-Ablauf mit erreichbarem validiertem Git-Payload.

Phase 7 darf erst nach separater Freigabe die tatsächliche Bootstrap-/öffentliche
End-to-End-Abnahme durchführen. Bis dahin: **STOPP vor Merge und Deployment**.
