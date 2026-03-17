const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const saltRounds = 10; // Anzahl der Iterationen (empfohlen: 10–12)

// GET /api/users → alle User holen
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users → neuen User anlegen
router.post('/', async (req, res) => {
  const { name, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    const result = await db.query(
      'INSERT INTO users (name, password) VALUES ($1, $2) RETURNING *',
      [name, hash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;