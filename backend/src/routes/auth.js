const express = require('express');
const { asyncHandler } = require('../utils/http');

function buildAuthRouter(service) {
  const router = express.Router();

  router.post('/register', asyncHandler(async (req, res) => {
    const user = await service.register(req.body || {});
    res.status(201).json({ user });
  }));

  router.post('/login', asyncHandler(async (req, res) => {
    const session = await service.login(req.body || {});
    res.json(session);
  }));

  router.post('/logout', asyncHandler(async (req, res) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    service.logout(token);
    res.status(204).send();
  }));

  return router;
}

module.exports = { buildAuthRouter };