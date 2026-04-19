# WhatsToDo

Eine webbasierte Aufgabenverwaltung für Teams, entwickelt im Rahmen des DevOps-Moduls an der DHGE.

Nutzer können Projekte anlegen, Teammitglieder mit verschiedenen Rollen einladen und gemeinsam Tasks verwalten. Tasks lassen sich beliebig tief verschachteln, sodass größere Aufgaben in kleinere Unteraufgaben aufgeteilt werden können.

---

## Inhaltsverzeichnis

- [Features](#features)
- [Tech-Stack](#tech-stack)
- [Projektstruktur](#projektstruktur)
- [Datenbankschema](#datenbankschema)
- [API-Endpunkte](#api-endpunkte)
- [Berechtigungssystem](#berechtigungssystem)
- [Installation](#installation)
- [Docker](#docker)
- [CI/CD](#cicd)
- [Umgebungsvariablen](#umgebungsvariablen)
- [Team](#team)

---

## Features

- Registrierung und Login mit bcrypt-Passwort-Hashing
- Session-basierte Authentifizierung über signierte Cookies (HMAC-SHA256)
- Projekte anlegen, bearbeiten und löschen
- Teammitglieder mit Rollen einladen (Guest, Mitarbeiter, Admin)
- Tasks mit Priorität, Status, Deadline und zugewiesenen Bearbeitern
- Beliebig tiefe Unteraufgaben (Parent-Child-Hierarchie)
- Dark- und Light-Mode-Umschaltung im Frontend
- Vollständige REST-API mit JSON

---

## Tech-Stack

| Bereich | Technologie |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Datenbank | PostgreSQL 16 |
| Authentifizierung | Cookie-basierte Sessions mit HMAC-SHA256 |
| Passwort-Hashing | bcrypt |
| Testing | Node.js Native Test Runner |
| Containerisierung | Docker, Docker Compose |
| CI/CD | GitHub Actions |

---

## Projektstruktur

```
WhatsToDo/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions Pipeline
├── backend/
│   ├── server.js               # Einstiegspunkt
│   ├── package.json
│   ├── .env.example            # Vorlage für Umgebungsvariablen
│   └── src/
│       ├── app.js              # Express-App-Factory (Dependency Injection)
│       ├── data/
│       │   └── store.js        # In-memory DataStore für Tests
│       ├── db/
│       │   └── index.js        # PostgreSQL-Connection-Pool
│       ├── routes/
│       │   ├── auth.js         # Login, Logout, Register, Me
│       │   ├── projects.js     # Projekt- und Mitgliederverwaltung
│       │   ├── tasks.js        # Task- und Assignee-Verwaltung
│       │   └── users.js        # Nutzerliste
│       ├── services/
│       │   ├── databaseService.js  # Implementierung mit PostgreSQL
│       │   └── storeService.js     # In-memory Fallback (kein DB nötig)
│       ├── utils/
│       │   ├── http.js         # asyncHandler-Wrapper
│       │   └── session.js      # Cookie-Erstellung, -Validierung, HMAC
│       └── __tests__/
│           └── app.test.js     # Integrationstests (laufen ohne DB)
├── db/
│   └── schema.sql              # Datenbankschema (wird beim Docker-Start eingespielt)
├── frontend/
│   ├── common.js               # Geteilte Logik (API-Aufrufe, Theme)
│   ├── style.css               # Globales Stylesheet (Dark/Light Mode)
│   ├── authSite/               # Login- und Registrierungsseite
│   │   ├── auth.html
│   │   └── auth.js
│   ├── mainSite/               # Dashboard
│   │   ├── index.html
│   │   └── logic.js
│   ├── projectSite/            # Projektverwaltung
│   │   ├── projects.html
│   │   └── projects.js
│   └── taskSite/               # Aufgabenverwaltung
│       ├── tasks.html
│       └── tasks.js
├── Dockerfile
└── docker-compose.yml
```

---

## Datenbankschema

<img width="982" height="468" alt="Datenbankschema" src="https://github.com/user-attachments/assets/15366515-719d-448a-ad40-9380747a2e3b" />

---

## API-Endpunkte

Alle Endpunkte unterhalb von `/api/auth` erfordern eine aktive Session (Cookie).

### Auth

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/api/auth/register` | Neuen Nutzer registrieren |
| POST | `/api/auth/login` | Einloggen, setzt Session-Cookie |
| POST | `/api/auth/logout` | Ausloggen, invalidiert die Session |
| GET | `/api/auth/me` | Aktuell eingeloggten Nutzer abfragen |

### Nutzer

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/users` | Alle Nutzer auflisten |
| GET | `/api/users/:userId` | Einzelnen Nutzer abrufen |

### Projekte

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/projects` | Eigene Projekte auflisten |
| POST | `/api/projects` | Neues Projekt anlegen |
| GET | `/api/projects/:projectId` | Einzelnes Projekt abrufen |
| PUT | `/api/projects/:projectId` | Projekt bearbeiten |
| DELETE | `/api/projects/:projectId` | Projekt löschen |

### Projektmitglieder

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/projects/:projectId/members` | Mitglieder auflisten |
| POST | `/api/projects/:projectId/members` | Mitglied hinzufügen |
| PUT | `/api/projects/:projectId/members/:userId` | Rolle eines Mitglieds ändern |
| DELETE | `/api/projects/:projectId/members/:userId` | Mitglied entfernen |

### Tasks

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/projects/:projectId/tasks` | Tasks eines Projekts auflisten |
| POST | `/api/projects/:projectId/tasks` | Neuen Task anlegen |
| GET | `/api/tasks/:taskId` | Task abrufen |
| PUT | `/api/tasks/:taskId` | Task bearbeiten |
| DELETE | `/api/tasks/:taskId` | Task löschen (inkl. aller Subtasks) |
| GET | `/api/tasks/:taskId/subtasks` | Unteraufgaben auflisten |

### Task-Assignees

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/tasks/:taskId/assignees` | Bearbeiter auflisten |
| POST | `/api/tasks/:taskId/assignees` | Bearbeiter hinzufügen |
| PUT | `/api/tasks/:taskId/assignees` | Bearbeiterliste komplett ersetzen |
| DELETE | `/api/tasks/:taskId/assignees/:userId` | Bearbeiter entfernen |

---

## Berechtigungssystem

Berechtigungen gelten pro Projekt – ein Nutzer kann in verschiedenen Projekten unterschiedliche Rollen haben.

| Rolle | Wert | Rechte |
|---|---|---|
| Guest | 0 | Lesen (Tasks und Mitglieder ansehen) |
| Mitarbeiter | 1 | Tasks anlegen, bearbeiten und abschließen |
| Admin | 2 | Alles, inkl. Mitglieder verwalten und Projekt löschen |

Der Ersteller eines Projekts bekommt automatisch Admin-Rechte und kann nicht aus dem Projekt entfernt werden.

---

## Installation

### Voraussetzungen

- [Node.js](https://nodejs.org) v20 oder höher
- [Docker](https://www.docker.com) und Docker Compose (für den einfachsten Einstieg)

### Mit Docker Compose (empfohlen)

```bash
git clone https://github.com/TheReaLNicrass/What-sToDo.git
cd WhatsToDo

docker compose up --build
```

Die App ist dann unter `http://localhost:3000` erreichbar. PostgreSQL wird automatisch als Container gestartet, das Schema wird beim ersten Hochfahren eingespielt.

### Ohne Docker (lokal)

```bash
# Abhängigkeiten installieren
cd backend
npm install

# Umgebungsvariablen setzen
cp .env.example .env
# .env anpassen (DB-Verbindung auf eine laufende Postgres-Instanz)

# Server starten
npm run dev       # Entwicklung mit Auto-Reload
npm start         # Produktion
```

---

## Docker

Das Projekt enthält ein `Dockerfile` für das Backend sowie eine `docker-compose.yml`, die den App-Container und einen PostgreSQL-Container gemeinsam startet.

```bash
# Stack starten
docker compose up -d --build

# Logs ansehen
docker compose logs -f app

# Stack stoppen und Volumes entfernen
docker compose down -v
```

Das Datenbankschema (`db/schema.sql`) wird automatisch beim ersten Start des Postgres-Containers eingespielt.

---

## CI/CD

Die Pipeline liegt unter `.github/workflows/ci.yml` und wird von GitHub Actions ausgeführt. Sie besteht aus drei Jobs, die nacheinander ablaufen.

### Wie die Pipeline funktioniert

**Job 1 – Tests (`test`)**

Dieser Job läuft bei jedem Push auf `main` oder `dev` sowie bei Pull Requests auf `main`. Er installiert die Abhängigkeiten und führt `npm test` aus. Die Tests nutzen den in-memory `StoreService`, brauchen also keine laufende Datenbank. Das ist praktisch, weil man so keine externe PostgreSQL-Instanz in der CI aufsetzen muss.

**Job 2 – Docker-Image bauen und pushen (`build-and-push`)**

Dieser Job läuft nur, wenn Job 1 erfolgreich war und der Push auf den `main`-Branch erfolgt ist. Er baut das Docker-Image und pushed es in die GitHub Container Registry (GHCR) unter `ghcr.io/<dein-github-nutzername>/what-stodo`. Das Image bekommt zwei Tags: `:latest` und den kurzen Commit-SHA (z.B. `:a1b2c3d`), damit man bei Bedarf auf einen bestimmten Stand zurückwechseln kann.

**Job 3 – Smoke Test (`smoke-test`)**

Ebenfalls nur auf `main`. Dieser Job startet den kompletten Stack via `docker compose up` und prüft, ob der `/api/health`-Endpunkt innerhalb von 90 Sekunden mit `{"status":"ok"}` antwortet. Es ist kein vollständiger Test, aber er stellt sicher, dass das Image zumindest hochfährt und die Datenbank erreichbar ist.

### Was man tun muss, damit die Pipeline funktioniert

1. **Packages für Repository freigeben**

   Das Image wird in die GitHub Container Registry gepusht. Damit das funktioniert, muss die GitHub Actions-Pipeline Schreibrechte auf Packages haben. In der `ci.yml` ist das bereits konfiguriert:

   ```yaml
   permissions:
     contents: read
     packages: write
   ```

   Das reicht normalerweise aus. Der `GITHUB_TOKEN` wird automatisch von GitHub bereitgestellt – es muss kein eigener Token angelegt werden.

2. **Sichtbarkeit des Packages einstellen**

   Nach dem ersten erfolgreichen Push erscheint das Image unter `github.com/<dein-nutzer>?tab=packages`. Standardmäßig ist es privat. Wenn es öffentlich gemacht werden soll (z.B. damit andere es mit `docker pull` ziehen können), kann man dies in den Package-Einstellungen auf GitHub ändern.

3. **Branch-Schutz und Secrets**

   Die Pipeline braucht keine zusätzlichen Secrets – `GITHUB_TOKEN` ist immer verfügbar. Wenn man die App auf einem Server deployen will, musst man dort eigene Secrets (z.B. `SESSION_SECRET`, DB-Passwort) als Repository-Secrets unter *Settings > Secrets and variables > Actions* hinterlegen und in der Pipeline referenzieren.

4. **Auf `dev` wird kein Image gebaut**

   Branches unter `dev` durchlaufen nur Job 1 (Tests). Das ist bewusst so gewählt, damit nicht bei jedem Feature-Branch ein Image in die Registry gepusht wird. Nur was in `main` landet, wird auch wirklich gebaut und veröffentlicht.

### Aktuellen Stand prüfen

Den Ablauf der Pipeline sieht man unter dem Tab *Actions* im GitHub-Repository. Wenn ein Job fehlschlägt, sieht man dort die Logs. Die häufigsten Fehler sind falsch gesetzte Permissions oder ein Syntaxfehler in der `docker-compose.yml`.

Das fertige Image kann nach einem erfolgreichen Build direkt gezogen werden:

```bash
docker pull ghcr.io/therealnicrass/what-stodo:latest
```

---

## Umgebungsvariablen

Eine Vorlage liegt unter `backend/.env.example`. Für den Betrieb mit Docker Compose werden die Werte direkt in der `docker-compose.yml` gesetzt.

```env
PORT=3000
SESSION_SECRET=dein_geheimer_session_schluessel

DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatstodo
DB_USER=dev
DB_PASSWORD=devpassword
```

Die `.env`-Datei sollte nie in Git eingecheckt werden.

---

## Team

| Name | Rolle |
|---|---|
| [Niclas Rassbach](https://github.com/TheReaLNicrass) | Backend – Node.js / Express / PostgreSQL |
| [Chris Rönick](https://github.com/ChrisLR0) | Backend – Node.js / Express / PostgreSQL |
| [Eliass Piske](https://github.com/tryazgaming) | Frontend – HTML / CSS / JavaScript |
| [Samira Fröh](https://github.com/lolsamsi) | Frontend – HTML / CSS / JavaScript |

---

Universitätsprojekt – DevOps, DHGE
