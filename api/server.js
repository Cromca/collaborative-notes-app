import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const file = process.env.NOTES_FILE || fileURLToPath(new URL('./notes.json', import.meta.url));
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const allowedOrigins = process.env.CORS_ORIGINS === undefined ? undefined
  : process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean);

createApp({ file, allowedOrigins }).listen(port, host, () => {
  console.log(`API sur http://${host}:${port}`);
});
