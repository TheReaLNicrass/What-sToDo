const express = require('express');
const path = require('path');
const { StoreService } = require('./services/storeService');
const { DatabaseService } = require('./services/databaseService');
const { buildAuthRouter } = require('./routes/auth');
const { buildProjectRouter } = require('./routes/projects');
const { buildTaskRouter } = require('./routes/tasks');
const { readSessionUserId } = require('./utils/session');

// createApp ist eine Factory-Funktion – der Service kann von außen injiziert werden.
// Das macht es möglich, im Test einen in-memory StoreService zu übergeben,
// ohne die echte DB zu brauchen (Dependency Injection Pattern).
function createApp({ storeService = null } = {}) {
  // Wenn DB_HOST gesetzt ist, wird PostgreSQL genutzt, sonst der dateibasierte Fallback.
  const service = storeService || (process.env.DB_HOST ? new DatabaseService() : new StoreService());
  const app = express();
  const frontendDir = path.join(__dirname, '../../frontend');

  app.use(express.json());

  // CORS-Header manuell setzen, damit die API auch von anderen Origins aus erreichbar ist.
  // In Produktion sollte '*' durch die tatsächliche Frontend-Domain ersetzt werden.
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
    return next();
  });

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', buildAuthRouter(service));

  // Auth-Middleware für alle geschützten /api-Routen.
  // Das Session-Cookie wird überprüft und der Nutzer an req.user gehängt,
  // damit nachfolgende Handler direkt darauf zugreifen können.
  // Doku zum Cookie-Format: src/utils/session.js
  app.use('/api', async (req, res, next) => {
    try {
      const userId = readSessionUserId(req.headers.cookie || '');
      if (!userId) return res.status(401).json({ error: 'Authentifizierung erforderlich.' });
      const user = await service.getUserById(userId);
      req.user = user;
      return next();
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/users', async (req, res, next) => {
    try {
      res.json({ users: await service.listUsers() });
    } catch (error) {
      next(error);
    }
  });
  app.get('/api/users/:userId', async (req, res, next) => {
    try {
      res.json({ user: await service.getUserById(req.params.userId) });
    } catch (error) {
      next(error);
    }
  });
  app.use('/api/projects', buildProjectRouter(service));
  app.use('/api/tasks', buildTaskRouter(service));

  app.use(express.static(frontendDir));
  app.get('/', (req, res) => res.sendFile(path.join(frontendDir, 'authSite/auth.html')));
  app.get('/auth', (req, res) => res.sendFile(path.join(frontendDir, 'authSite/auth.html')));
  app.get('/dashboard', (req, res) => res.sendFile(path.join(frontendDir, 'mainSite/index.html')));
  app.get('/projects', (req, res) => res.sendFile(path.join(frontendDir, 'projectSite/projects.html')));
  app.get('/tasks', (req, res) => res.sendFile(path.join(frontendDir, 'taskSite/tasks.html')));

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    return res.status(error.status || 500).json({ error: error.message || 'Interner Serverfehler.' });
  });

  return app;
}

module.exports = { createApp };