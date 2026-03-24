# 📋 WhatsToDo – Enterprise ToDo Manager

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
- [Kommunikationsfluss Microservices](#-kommunikation-der-microservices)
- [API Endpunkte](#-api-endpunkte)
- [Installation](#-installation)
- [Umgebungsvariablen](#-umgebungsvariablen)
- [Berechtigungssystem](#-berechtigungssystem)
- [Team](#-team)

---

## 🚀 Über das Projekt

**WhatsToDo** ist eine webbasierte Aufgabenverwaltung für Unternehmen. Nutzer können Projekte anlegen, Teammitglieder einladen und gemeinsam Tasks verwalten. Tasks lassen sich beliebig tief verschachteln – so können große Aufgaben in übersichtliche Unteraufgaben aufgeteilt werden.

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
| **Authentifizierung** | bcrypt (Passwort-Hashing) |
| **API-Testing** | Postman / Bruno |
| **Testing** | Node.js Native Test Runner |

---

## 📂 Projektstruktur

```
What-sToDo/
├── README.md
├── frontend/
│   ├── index.html
│   ├── logic.js
│   └── style.css
└── backend/
    ├── package.json
    ├── server.js
    ├── data/
    │   └── store.json
    └── src/
        ├── app.js
        ├── __tests__/
        │   └── app.test.js
        ├── assets/
        │   ├── components.puml
        │   └── db_schema.puml
        ├── data/
        │   └── store.js
        ├── routes/
        │   ├── auth.js
        │   ├── projects.js
        │   └── tasks.js
        ├── services/
        │   └── storeService.js
        └── utils/
            └── http.js
```

## 🌐 API Endpunkte

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Users
- `GET /api/users`
- `POST /api/users`

### Projects
- `GET /api/projects`
- `GET /api/projects/:projectId`
- `POST /api/projects`
- `PUT /api/projects/:projectId`
- `DELETE /api/projects/:projectId`

### Project Members
- `GET /api/projects/:projectId/members`
- `POST /api/projects/:projectId/members`
- `PUT /api/projects/:projectId/members/:userId`
- `DELETE /api/projects/:projectId/members/:userId`

### Tasks
- `GET /api/projects/:projectId/tasks`
- `POST /api/projects/:projectId/tasks`
- `GET /api/tasks/:taskId`
- `PUT /api/tasks/:taskId`
- `DELETE /api/tasks/:taskId`
- `GET /api/tasks/:taskId/subtasks`

### Task Assignees
- `GET /api/tasks/:taskId/assignees`
- `POST /api/tasks/:taskId/assignees`
- `PUT /api/tasks/:taskId/assignees`
- `DELETE /api/tasks/:taskId/assignees/:userId`

---

## 🗃️ Datenbankschema

<img width="982" height="468" alt="Datenbankschema" src="https://github.com/user-attachments/assets/15366515-719d-448a-ad40-9380747a2e3b" />

## 📞 Kommunikation der Microservices
<img width="723" height="858" alt="image" src="https://github.com/user-attachments/assets/e7fc882b-a07a-49d2-ab10-38aeba101458" />

## ⚙️ Installation

### Voraussetzungen

- [Node.js](https://nodejs.org) (v18 oder höher)
- [PostgreSQL](https://www.postgresql.org) (v14 oder höher)

### 1. Repository klonen

```bash
git clone https://github.com/TheReaLNicrass/What-sToDo.git
cd WhatsToDo
```

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Datenbank einrichten

```bash
# In PostgreSQL einloggen und Datenbank erstellen
psql -U postgres
CREATE DATABASE WhatsToDo;
\q

# Schema importieren
psql -U postgres -d WhatsToDo -f sql/schema.sql
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
DB_NAME=WhatsToDo
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
| [Niclas Rassbach](https://github.com/TheReaLNicrass) | Backend – Node.js / Express / PostgreSQL |
| [Chris Rönick](https://github.com/ChrisLR0) | Backend – Node.js / Express / PostgreSQL |
| [Eliass Piske](https://github.com/tryazgaming) | Frontend – HTML / CSS / JavaScript |
| [Samira Fröh](https://github.com/lolsamsi) | Frontend – HTML / CSS / JavaScript |

---

> 📚 Universitätsprojekt – DevOps
