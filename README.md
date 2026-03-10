# 📋 TaskFlow – Enterprise ToDo Manager

> Eine kollaborative Aufgabenverwaltung für Unternehmen mit Projekten, Teams und Berechtigungen.

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2023-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

---

## 📖 Inhaltsverzeichnis

- [Über das Projekt](#-über-das-projekt)
- [Features](#-features)
- [Tech-Stack](#-tech-stack)
- [Projektstruktur](#-projektstruktur)
- [Datenbankschema](#-datenbankschema)
- [API Endpunkte](#-api-endpunkte)
- [Installation](#-installation)
- [Umgebungsvariablen](#-umgebungsvariablen)
- [Berechtigungssystem](#-berechtigungssystem)
- [Team](#-team)

---

## 🚀 Über das Projekt

**TaskFlow** ist eine webbasierte Aufgabenverwaltung für Unternehmen. Nutzer können Projekte anlegen, Teammitglieder einladen und gemeinsam Tasks verwalten. Tasks lassen sich beliebig tief verschachteln – so können große Aufgaben in übersichtliche Unteraufgaben aufgeteilt werden.

---

## ✨ Features

- 👤 **Nutzerverwaltung** – Registrierung & Login mit sicherer Passwort-Verschlüsselung (bcrypt)
- 📁 **Projekte** – Erstellen, bearbeiten und löschen von Projekten
- 👥 **Teammitglieder** – Nutzer zu Projekten einladen und Berechtigungen vergeben
- ✅ **Tasks** – Aufgaben mit Priorität, Status, Deadline und Bearbeitern
- 🔀 **Unteraufgaben** – Beliebig tiefe Verschachtelung von Tasks
- 🔒 **Berechtigungssystem** – Drei Rollen: Guest, Mitarbeiter, Admin
- 🌐 **REST-API** – Vollständige JSON-API für das Frontend

---

## 🛠 Tech-Stack

| Bereich | Technologie |
|---|---|
| **Frontend** | HTML, CSS, JavaScript |
| **Backend** | Node.js, Express.js |
| **Datenbank** | PostgreSQL |
| **Authentifizierung** | JWT + bcrypt |
| **API-Testing** | Postman / Thunder Client |

---

## 📂 Projektstruktur

```
taskflow/
│
├── 📄 server.js                  # Einstiegspunkt – startet den Server
├── 📄 package.json               # Abhängigkeiten & npm-Skripte
├── 📄 .env                       # Umgebungsvariablen (nicht in Git!)
├── 📄 .env.example               # Vorlage für Umgebungsvariablen
├── 📄 .gitignore
│
├── 📁 src/
│   │
│   ├── 📄 app.js                 # Express-App, Middleware, Routen
│   │
│   ├── 📁 routes/                # URL-Endpunkte
│   │   ├── 📄 auth.routes.js
│   │   ├── 📄 user.routes.js
│   │   ├── 📄 project.routes.js
│   │   ├── 📄 projectMember.routes.js
│   │   ├── 📄 task.routes.js
│   │   └── 📄 taskAssignee.routes.js
│   │
│   ├── 📁 controllers/           # Logik hinter den Endpunkten
│   │   ├── 📄 auth.controller.js
│   │   ├── 📄 user.controller.js
│   │   ├── 📄 project.controller.js
│   │   ├── 📄 projectMember.controller.js
│   │   ├── 📄 task.controller.js
│   │   └── 📄 taskAssignee.controller.js
│   │
│   ├── 📁 models/                # Datenbankzugriff
│   │   ├── 📄 user.model.js
│   │   ├── 📄 project.model.js
│   │   ├── 📄 projectMember.model.js
│   │   ├── 📄 task.model.js
│   │   └── 📄 taskAssignee.model.js
│   │
│   ├── 📁 middleware/            # Authentifizierung & Berechtigungen
│   │   ├── 📄 auth.middleware.js
│   │   ├── 📄 permission.middleware.js
│   │   └── 📄 error.middleware.js
│   │
│   └── 📁 db/
│       └── 📄 index.js           # PostgreSQL Connection Pool
│
└── 📁 sql/
    └── 📄 schema.sql             # Datenbankschema (CREATE TABLE Statements)
```

---

## 🗄 Datenbankschema

```
users ────────────── projectMembers ────────────── projects
  │                        │                           │
  │                  (permission 0/1/2)                │
  │                                                    │
  └─────────────── tasks (erstellt von) ───────────────┘
                       │
             ┌─────────┼──────────┐
             │         │          │
        parent_id  assignees   priority
        (self-ref)
```

| Tabelle | Beschreibung |
|---|---|
| `users` | Alle registrierten Nutzer |
| `projects` | Projekte / Gruppen |
| `projectMembers` | Mitgliedschaft & Rollen pro Projekt |
| `tasks` | Tasks & Unteraufgaben (rekursiv via `parentId`) |
| `task_assignees` | Zugewiesene Bearbeiter pro Task |

---

## 🌐 API Endpunkte

### Auth
| Methode | Endpunkt | Beschreibung |
|---|---|---|
| `POST` | `/api/auth/register` | Neuen Nutzer registrieren |
| `POST` | `/api/auth/login` | Einloggen & JWT erhalten |
| `POST` | `/api/auth/logout` | Ausloggen |

### Projekte
| Methode | Endpunkt | Beschreibung |
|---|---|---|
| `GET` | `/api/projects` | Alle eigenen Projekte abrufen |
| `GET` | `/api/projects/:id` | Einzelnes Projekt abrufen |
| `POST` | `/api/projects` | Neues Projekt erstellen |
| `PUT` | `/api/projects/:id` | Projekt bearbeiten |
| `DELETE` | `/api/projects/:id` | Projekt löschen |

### Mitglieder
| Methode | Endpunkt | Beschreibung |
|---|---|---|
| `GET` | `/api/projects/:id/members` | Alle Mitglieder eines Projekts |
| `POST` | `/api/projects/:id/members` | Mitglied hinzufügen |
| `PUT` | `/api/projects/:id/members/:userId` | Berechtigung ändern |
| `DELETE` | `/api/projects/:id/members/:userId` | Mitglied entfernen |

### Tasks
| Methode | Endpunkt | Beschreibung |
|---|---|---|
| `GET` | `/api/projects/:id/tasks` | Alle Top-Level Tasks eines Projekts |
| `GET` | `/api/tasks/:id` | Einzelnen Task abrufen |
| `GET` | `/api/tasks/:id/subtasks` | Unteraufgaben eines Tasks |
| `POST` | `/api/projects/:id/tasks` | Neuen Task erstellen |
| `PUT` | `/api/tasks/:id` | Task bearbeiten |
| `DELETE` | `/api/tasks/:id` | Task löschen |

### Task-Bearbeiter
| Methode | Endpunkt | Beschreibung |
|---|---|---|
| `GET` | `/api/tasks/:id/assignees` | Alle Bearbeiter eines Tasks |
| `POST` | `/api/tasks/:id/assignees` | Bearbeiter zuweisen |
| `DELETE` | `/api/tasks/:id/assignees/:userId` | Bearbeiter entfernen |

---

## ⚙️ Installation

### Voraussetzungen

- [Node.js](https://nodejs.org) (v18 oder höher)
- [PostgreSQL](https://www.postgresql.org) (v14 oder höher)

### 1. Repository klonen

```bash
git clone https://github.com/euer-username/taskflow.git
cd taskflow
```

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Datenbank einrichten

```bash
# In PostgreSQL einloggen und Datenbank erstellen
psql -U postgres
CREATE DATABASE taskflow;
\q

# Schema importieren
psql -U postgres -d taskflow -f sql/schema.sql
```

### 4. Umgebungsvariablen setzen

```bash
cp .env.example .env
# .env Datei mit euren Werten befüllen
```

### 5. Server starten

```bash
# Entwicklung (mit Auto-Reload)
npm run dev

# Produktion
npm start
```

Der Server läuft nun auf: **http://localhost:3000**

---

## 🔧 Umgebungsvariablen

Legt eine `.env` Datei im Root-Verzeichnis an (orientiert euch an `.env.example`):

```env
# Server
PORT=3000

# Datenbank
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskflow
DB_USER=euer_db_nutzer
DB_PASSWORD=euer_passwort

# JWT
JWT_SECRET=euer_geheimer_schluessel
JWT_EXPIRES_IN=7d
```

> ⚠️ Die `.env` Datei **niemals** in Git einchecken!

---

## 🔒 Berechtigungssystem

Berechtigungen gelten **pro Projekt** – ein Nutzer kann in verschiedenen Projekten unterschiedliche Rollen haben.

| Rolle | Wert | Rechte |
|---|---|---|
| **Guest** | `0` | 👁️ Nur lesen (Tasks & Mitglieder ansehen) |
| **Mitarbeiter** | `1` | ✏️ Tasks anlegen, bearbeiten & abhaken |
| **Admin** | `2` | ⚙️ Alles – inkl. Mitglieder verwalten & Projekt löschen |

> Der **Ersteller** eines Projekts erhält automatisch Admin-Rechte (`2`).

---

## 👨‍💻 Team

| Name | Rolle |
|---|---|
| [Vorname Nachname](https://github.com/username) | Backend – Node.js / Express / PostgreSQL |
| [Vorname Nachname](https://github.com/username) | Backend – Node.js / Express / PostgreSQL |
| [Vorname Nachname](https://github.com/username) | Frontend – HTML / CSS / JavaScript |
| [Vorname Nachname](https://github.com/username) | Frontend – HTML / CSS / JavaScript |

---

> 📚 Universitätsprojekt – Webentwicklung
