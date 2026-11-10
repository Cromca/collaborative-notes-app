import express from 'express';
import cors from 'cors';
import { createNoteStore } from './store.js';

const LOCAL_ORIGINS = [
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:4173', 'http://127.0.0.1:4173',
];

export function createApp({ file, allowedOrigins = LOCAL_ORIGINS }) {
  for (const origin of allowedOrigins) {
    let parsed;
    try { parsed = new URL(origin); } catch { throw new Error(`Origine CORS invalide : ${origin}`); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error(`Origine CORS invalide : ${origin}`);
    }
  }
  const trustedOrigins = new Set(allowedOrigins);
  const app = express();
  const store = createNoteStore(file);
  app.disable('x-powered-by');
  app.use(cors({
    exposedHeaders: ['X-Total-Count'],
    origin(origin, callback) {
      if (origin === undefined || trustedOrigins.has(origin)) return callback(null, true);
      const error = new Error('Cette origine web n’est pas autorisée.');
      error.code = 'CORS_FORBIDDEN';
      callback(error);
    },
  }));
  app.use(express.json({ limit: '100kb' }));

  app.post('/notes', async (req, res) => {
    const fields = req.body;
    if (!fields || Array.isArray(fields) || typeof fields.title !== 'string'
      || !fields.title.trim() || fields.title.trim().length > 160) {
      return res.status(400).json({ error: 'Le titre doit contenir entre 1 et 160 caractères.' });
    }
    if (fields.body !== undefined && (typeof fields.body !== 'string' || fields.body.length > 20000)) {
      return res.status(400).json({ error: 'Le contenu doit être un texte de 20 000 caractères maximum.' });
    }
    if (fields.tag !== undefined && (typeof fields.tag !== 'string' || fields.tag.trim().length > 50)) {
      return res.status(400).json({ error: 'Le tag doit être un texte de 50 caractères maximum.' });
    }
    const { note, total } = await store.create({
      title: fields.title.trim(), body: fields.body ?? '', tag: fields.tag?.trim() ?? '',
    });
    res.set('X-Total-Count', String(total));
    res.status(201).json(note);
  });

  app.get('/notes', async (req, res) => {
    const rawPage = req.query.page;
    const page = rawPage === undefined ? 1 : Number(rawPage);
    if ((rawPage !== undefined && (typeof rawPage !== 'string' || !/^\d+$/.test(rawPage)))
      || !Number.isSafeInteger(page) || page < 1) {
      return res.status(400).json({ error: 'page doit être un entier supérieur ou égal à 1' });
    }
    const notes = await store.list();
    const size = 10;
    // La pagination commence à 1 (correction d'origine de Hugo, PR #8).
    const start = (page - 1) * size;
    res.set('X-Total-Count', String(notes.length));
    res.json(notes.slice(start, start + size));
  });

  app.get('/notes/by-tag/:tag', async (req, res) => {
    const notes = await store.list();
    res.json(notes.filter(note => note.tag === req.params.tag));
  });

  app.get('/search', async (req, res) => {
    const query = req.query.q;
    if (typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'q doit être un texte de recherche non vide.' });
    }
    const notes = await store.list();
    const searchTerm = query.trim().toLocaleLowerCase('fr');
    res.json(notes.filter(note => typeof note.title === 'string'
      && note.title.toLocaleLowerCase('fr').includes(searchTerm)));
  });

  app.delete('/notes/:id', async (req, res) => {
    if (!await store.remove(req.params.id)) {
      return res.status(404).json({ error: 'Note introuvable.' });
    }
    res.status(204).end();
  });

  app.use((_req, res) => res.status(404).json({ error: 'Route introuvable.' }));
  app.use((error, _req, res, _next) => {
    if (error.code === 'CORS_FORBIDDEN') {
      return res.status(403).json({ error: error.message });
    }
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Le corps de la requête doit être du JSON valide.' });
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ error: 'La requête est trop volumineuse.' });
    }
    res.status(500).json({ error: 'Impossible de lire ou enregistrer les notes. Réessayez.' });
  });
  return app;
}
