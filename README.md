# Hierarchische Todo-Kartenverwaltung

Eine moderne, responsive Single Page Application für hierarchische Todo-/Kartenverwaltung mit Rollenrechten, umfangreichen Filter- und Sortierfunktionen und lokaler Persistenz.

## 🚀 Features

### Kernfunktionen
- **Hierarchische Struktur**: Karten können beliebig tief verschachtelt werden (wie ein Dateisystem)
- **Breadcrumb-Navigation**: Übersichtliche Navigation durch die Hierarchieebenen
- **Responsive Grid-Layout**: Karten werden nebeneinander angezeigt und brechen bei Platzmangel um
- **Finish Area**: Erledigte Karten werden in einem separaten Bereich angezeigt

### Rollen & Rechte (RBAC)
- **Admin**: Volle Kontrolle über alle Karten und Funktionen
- **Mitarbeiter** (Standard): Kann Karten abhaken, eigene Unterkarten erstellen/bearbeiten/löschen
- **Gast**: Nur Leserechte, keine Änderungen möglich

### Datenmodell
Jede Karte enthält:
- Titel (Pflichtfeld)
- Beschreibung
- Deadline mit Datepicker
- Zugewiesene Personen (Tags)
- Ersteller
- **5 Prioritätsstufen**: Critical, High, Medium, Low, Nice-to-have (farblich markiert)
- **5 Status**: Idea, Paused, In Progress, Blocked, Done
- Automatische Timestamps (createdAt, updatedAt)

### Filter & Sortierung
**Sortierung** nach:
- Name (A→Z, Z→A)
- Deadline (nächstes/spätestes zuerst)
- Priorität (hoch→niedrig / niedrig→hoch)
- Status

**Filter** nach:
- Deadline-Zeitraum (von–bis)
- Zugewiesener Person
- Ersteller
- Status
- Priorität(en) - mehrfach auswählbar
- Filter sind kombinierbar mit "Reset"-Button

### Persistenz
- Alle Daten werden im **LocalStorage** gespeichert
- Automatisches Speichern bei jeder Änderung
- Beispieldaten beim ersten Start
- Reset-Funktion zum Zurücksetzen auf Beispieldaten

## 📦 Installation & Start

### Voraussetzungen
- Node.js (v18 oder höher)
- npm oder pnpm

### Installation
```bash
# Dependencies installieren
npm install
# oder
pnpm install
```

### Entwicklungsserver starten
```bash
npm run dev
# oder
pnpm run dev
```

Die App läuft dann auf `http://localhost:5173` (oder einem anderen verfügbaren Port).

### Production Build
```bash
npm run build
# oder
pnpm run build
```

## 🎯 Verwendung

### Rollenauswahl
Wählen Sie oben rechts Ihre Rolle: **Admin**, **Mitarbeiter** oder **Gast**

### Navigation
1. **Root-Ebene**: Zeigt alle Hauptkarten ohne übergeordnete Karte
2. **Karte öffnen**: Klick auf "Öffnen"-Button zeigt die Unterkarten
3. **Breadcrumb**: Klick auf einen Pfad-Teil springt zur entsprechenden Ebene
4. **Zurück-Button**: Springt eine Ebene nach oben

### Karten erstellen
1. Klick auf "+ Neue Karte"
2. Formular ausfüllen:
   - **Titel** (Pflicht)
   - Beschreibung
   - Deadline (Datum + Uhrzeit)
   - Zugewiesen an (Komma-getrennt: "Maria Schmidt, Tom Weber")
   - Erstellt von
   - Priorität (Critical bis Nice-to-have)
   - Status (Idea bis Done)
3. "Erstellen" klicken

### Karten bearbeiten
- Als **Admin**: Alle Karten bearbeitbar
- Als **Mitarbeiter**: Nur eigene Karten (createdByRole = "Mitarbeiter" + gleicher User)
- Klick auf Bearbeiten-Button (Stift-Icon)

### Karten löschen
- Als **Admin**: Alle Karten löschbar
- Als **Mitarbeiter**: Nur eigene Karten
- Löschen entfernt rekursiv alle Unterkarten
- Bestätigungsdialog vor dem Löschen

### Karten abhaken
- Checkbox aktivieren → Status wird auf "Done" gesetzt
- Karte wird in die **Finish Area** verschoben
- Alle Rollen außer Gast können abhaken

### Filter & Sortierung
- **Linke Sidebar**: Sortier- und Filteroptionen
- Filter sind kombinierbar
- "Filter zurücksetzen" entfernt alle aktiven Filter

## 📁 Projektstruktur

```
/src/app/
├── App.tsx                      # Hauptkomponente mit Layout
├── routes.ts                    # React Router Konfiguration
├── types.ts                     # TypeScript Typen
│
├── contexts/
│   └── AppContext.tsx           # Globaler State (Karten, Rolle, Filter)
│
├── pages/
│   └── TodoLevel.tsx            # Hauptansicht für jede Hierarchieebene
│
├── components/
│   ├── Breadcrumb.tsx           # Breadcrumb-Navigation
│   ├── CardModal.tsx            # Modal zum Erstellen/Bearbeiten
│   ├── RoleSelector.tsx         # Rollenauswahl-Komponente
│   ├── Sidebar.tsx              # Filter & Sortierung Sidebar
│   └── TodoCard.tsx             # Einzelne Karten-Komponente
│
└── utils/
    ├── permissions.ts           # Rechteprüfung (RBAC)
    ├── seedData.ts              # Beispieldaten
    └── storage.ts               # LocalStorage Helfer
```

## 🔧 Konfiguration

### Rollen anpassen
Editieren Sie `/src/app/utils/permissions.ts`:
```typescript
export const permissions = {
  canEdit: (card, currentRole, currentUserId) => { /* ... */ },
  canDelete: (card, currentRole, currentUserId) => { /* ... */ },
  // ...
};
```

### Beispieldaten anpassen
Editieren Sie `/src/app/utils/seedData.ts`:
```typescript
export const seedData: TodoCard[] = [
  // Ihre Beispieldaten hier
];
```

### Prioritäten/Status anpassen
Editieren Sie `/src/app/types.ts`:
```typescript
export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'nice-to-have';
export type Status = 'idea' | 'paused' | 'in-progress' | 'blocked' | 'done';
```

Und aktualisieren Sie die Farben in `/src/app/components/TodoCard.tsx`.

## 🎨 Design & Styling

- **Tailwind CSS v4**: Utility-First CSS Framework
- **Lucide React**: Icon-Bibliothek
- **Responsive Design**: Mobile-first Ansatz mit Hamburger-Menü
- **Farbcodierung**:
  - Critical: Rot
  - High: Orange
  - Medium: Gelb
  - Low: Grün
  - Nice-to-have: Grau

## 🔐 Sicherheit & Datenschutz

⚠️ **Wichtig**: Dies ist eine **rein clientseitige** Demo-Anwendung:
- Keine echte Authentifizierung
- Daten werden lokal im Browser gespeichert
- Nicht für produktive Umgebungen mit echten Nutzerdaten geeignet
- Keine Server-seitige Validierung

Für produktive Anwendungen:
- Backend-API implementieren
- Echte User-Authentifizierung (JWT, OAuth, etc.)
- Server-seitige Rechteprüfung
- Datenbank statt LocalStorage

## 📝 Beispiel-Workflow

1. **Als Admin**: 
   - Projekt "Website Relaunch" erstellen (Critical Priority)
   - Unterkarten hinzufügen: "Design", "Frontend", "Backend"
   
2. **In "Frontend"-Karte navigieren**:
   - Weitere Unteraufgaben erstellen: "Komponenten", "Navigation", "SEO"
   
3. **Als Mitarbeiter**:
   - Eigene Notizen/Subtasks zu Admin-Karten hinzufügen
   - Aufgaben abhaken
   - Eigene Karten bearbeiten/löschen

4. **Filter verwenden**:
   - "Nur meine Aufgaben" filtern
   - "Nur Critical/High" Priority anzeigen
   - Nach Deadline sortieren

## 🐛 Troubleshooting

### Daten werden nicht gespeichert
- Prüfen Sie, ob LocalStorage im Browser aktiviert ist
- Private/Inkognito-Modus löscht Daten nach Schließen

### Karten verschwinden nach Reload
- "Reset"-Button lädt Beispieldaten neu
- LocalStorage könnte voll sein (Limit: ~5-10 MB)

### Filter funktioniert nicht
- "Filter zurücksetzen" klicken
- Browser-Cache leeren

## 📄 Lizenz

MIT License - Frei verwendbar für private und kommerzielle Projekte.

---

**Entwickelt mit React, TypeScript, Tailwind CSS & ❤️**
