const express = require('express');
const path = require('path');
const { StoreService } = require('./services/storeService');
const { buildAuthRouter } = require('./routes/auth');
const { buildProjectRouter } = require('./routes/projects');
const { buildTaskRouter } = require('./routes/tasks');

function createApp({ storeService = new StoreService() } = {}) {
  const app = express();
  const frontendDir = path.join(__dirname, '../../frontend');

  app.use(express.json());
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
    return next();
  });

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', buildAuthRouter(storeService));

  app.use('/api', (req, res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const user = storeService.getUserByToken(token);
    if (!user) return res.status(401).json({ error: 'Authentifizierung erforderlich.' });
    req.user = user;
    return next();
  });

  app.get('/api/users', (req, res) => res.json({ users: storeService.listUsers() }));
  app.get('/api/users/:userId', (req, res) => res.json({ user: storeService.getUserById(req.params.userId) }));
  app.use('/api/projects', buildProjectRouter(storeService));
  app.use('/api/tasks', buildTaskRouter(storeService));

  app.use(express.static(frontendDir));
  app.get('/', (req, res) => res.sendFile(path.join(frontendDir, 'index.html')));

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    return res.status(error.status || 500).json({ error: error.message || 'Interner Serverfehler.' });
  });

  return app;
}

module.exports = { createApp };