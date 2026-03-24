require('dotenv').config();
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 3000;
createApp().listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});