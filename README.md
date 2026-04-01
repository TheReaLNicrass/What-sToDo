# WhatsToDo

Eine webbasierte Aufgabenverwaltung für Teams, entwickelt im Rahmen des DevOps-Moduls an der DHGE.

Nutzer können Projekte anlegen, Teammitglieder mit verschiedenen Rollen einladen und gemeinsam Tasks verwalten. Tasks lassen sich beliebig tief verschachteln, sodass große Aufgaben in übersichtliche Unteraufgaben aufgeteilt werden können.

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
- [Team](#team)

---

## Features

- Registrierung und Login mit bcrypt-Passwort-Hashing
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
│       └── ci.yml          # GitHub Actions Pipeline
├── backend/
│   ├── server.js           # Einstiegspunkt
│   ├── .env.example        # Vorlage für Umgebungsvariablen
│   └── src/
│       ├── app.js          # Express-App-Factory
│       ├── db/             # PostgreSQL-Connection-Pool
│       ├── routes/         # Auth, Projekte, Tasks
│       ├── services/       # DatabaseService (Postgres) / StoreService (Fallback)
│       ├── utils/          # Session, HTTP-Hilfsfunktionen
│       └── __tests__/
│           └── app.test.js # Integrationstests
├── db/
│   └── schema.sql          # Datenbankschema (wird beim Docker-Start eingespielt)
├── frontend/
│   ├── common.js           # Geteilte Logik (API, Shell, Theme)
│   ├── style.css           # Globales Stylesheet (Dark/Light Mode)
│   ├── authSite/           # Login- und Registrierungsseite
│   ├── mainSite/           # Dashboard
│   ├── projectSite/        # Projektverwaltung
│   └── taskSite/           # Aufgabenverwaltung
├── Dockerfile
└── docker-compose.yml
```

---

## Datenbankschema

<img width="982" height="468" alt="Datenbankschema" src="https://github.com/user-attachments/assets/15366515-719d-448a-ad40-9380747a2e3b" />

---

## API-Endpunkte

### Auth
| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/api/auth/register` | Neuen Nutzer registrieren |
| POST | `/api/auth/login` | Einloggen, setzt Session-Cookie |
| POST | `/api/auth/logout` | Ausloggen, löscht Session |
| GET | `/api/auth/me` | Aktuellen Nutzer abfragen |

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
| GET | `/api/projects/:projectId` | Projekt abrufen |
| PUT | `/api/projects/:projectId` | Projekt bearbeiten |
| DELETE | `/api/projects/:projectId` | Projekt löschen |

### Projektmitglieder
| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/projects/:projectId/members` | Mitglieder auflisten |
| POST | `/api/projects/:projectId/members` | Mitglied hinzufügen |
| PUT | `/api/projects/:projectId/members/:userId` | Rolle ändern |
| DELETE | `/api/projects/:projectId/members/:userId` | Mitglied entfernen |

### Tasks
| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/projects/:projectId/tasks` | Tasks eines Projekts auflisten |
| POST | `/api/projects/:projectId/tasks` | Neuen Task anlegen |
| GET | `/api/tasks/:taskId` | Task abrufen |
| PUT | `/api/tasks/:taskId` | Task bearbeiten |
| DELETE | `/api/tasks/:taskId` | Task löschen (inkl. Subtasks) |
| GET | `/api/tasks/:taskId/subtasks` | Unteraufgaben auflisten |

### Task-Assignees
| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/tasks/:taskId/assignees` | Bearbeiter auflisten |
| POST | `/api/tasks/:taskId/assignees` | Bearbeiter hinzufügen |
| PUT | `/api/tasks/:taskId/assignees` | Bearbeiter komplett ersetzen |
| DELETE | `/api/tasks/:taskId/assignees/:userId` | Bearbeiter entfernen |

---

## Berechtigungssystem

Berechtigungen gelten pro Projekt – ein Nutzer kann in verschiedenen Projekten unterschiedliche Rollen haben.

| Rolle | Wert | Rechte |
|---|---|---|
| Guest | 0 | Lesen (Tasks und Mitglieder ansehen) |
| Mitarbeiter | 1 | Tasks anlegen, bearbeiten und abschließen |
| Admin | 2 | Alles, inkl. Mitglieder verwalten und Projekt löschen |

Der Ersteller eines Projekts bekommt automatisch Admin-Rechte.

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

Die GitHub Actions Pipeline unter `.github/workflows/ci.yml` besteht aus drei Jobs:

1. **Tests ausführen** – läuft bei jedem Push und Pull Request auf `main` und `dev`. Nutzt den in-memory `StoreService`, braucht also keine externe Datenbank.
2. **Docker-Image bauen und pushen** – läuft nur beim Merge auf `main`, baut das Image und pusht es in die GitHub Container Registry (`ghcr.io`).
3. **Smoke Test** – startet den kompletten Stack via `docker compose` und prüft den `/api/health`-Endpunkt.

Das fertige Image kann direkt via Docker Compose gezogen und gestartet werden:

```bash
docker pull ghcr.io/therealnicroass/what-stodo:latest
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
