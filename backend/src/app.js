const express = require('express');
const path = require('path');

const app = express();

app.use(express.json());

const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

const frontendPath = path.join(__dirname, '..', '..', 'frontend');
app.use(express.static(frontendPath));

app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

module.exports = app;
