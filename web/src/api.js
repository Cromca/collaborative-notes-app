const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Impossible de joindre le serveur. Vérifiez que l’API est démarrée.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Erreur du serveur (${response.status}).`);
  if (data === null) throw new Error('La réponse du serveur est invalide.');
  return { data, headers: response.headers };
}

export async function getNotes({ page, query, signal }) {
  const path = query ? `/search?q=${encodeURIComponent(query)}` : `/notes?page=${page}`;
  const { data, headers } = await request(path, { signal });
  if (!Array.isArray(data)) throw new Error('La liste des notes est invalide.');
  const total = query ? data.length : Number(headers.get('X-Total-Count') ?? data.length);
  return { notes: data, total };
}

export async function createNote(note) {
  const { data } = await request('/notes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(note),
  });
  return data;
}
