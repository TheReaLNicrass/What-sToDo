const express = require('express');
const { asyncHandler } = require('../utils/http');
const { createSessionCookie, clearSessionCookie, readSessionUserId } = require('../utils/session');

function buildAuthRouter(service) {
  const router = express.Router();

  router.post('/register', asyncHandler(async (req, res) => {
    const user = await service.register(req.body || {});
    res.status(201).json({ user });
  }));

  router.post('/login', asyncHandler(async (req, res) => {
    const loginResult = await service.login(req.body || {});
    const user = loginResult?.user || loginResult;
    if (!user?.id) {
      const error = new Error('Login-Antwort ist ungültig.');
      error.status = 500;
      throw error;
    }
    res.setHeader('Set-Cookie', createSessionCookie(user.id));
    res.json({ user });
  }));

  router.post('/logout', asyncHandler(async (req, res) => {
    const userId = readSessionUserId(req.headers.cookie || '');
    await service.logout?.(userId);
    res.setHeader('Set-Cookie', clearSessionCookie());
    res.status(204).send();
  }));

  router.get('/me', asyncHandler(async (req, res) => {
    const userId = readSessionUserId(req.headers.cookie || '');
    if (!userId) return res.status(401).json({ error: 'Authentifizierung erforderlich.' });
    const user = await service.getUserById(userId);
    return res.json({ user });
  }));

  return router;
}

module.exports = { buildAuthRouter };