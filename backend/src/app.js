const express = require('express');
const app = express();

app.use(express.json()); // JSON-Body aus Requests lesen

// Routen einbinden (Beispiel)
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

module.exports = app;