import { useEffect, useRef, useState } from 'react';
import { createNote, getNotes } from './api';
import './App.css';

const makeRequestKey = (page, query, revision) => JSON.stringify([page, query, revision]);

export default function App() {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const [settledRequest, setSettledRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const submissionLock = useRef(false);
  const query = search.trim();
  const requestKey = makeRequestKey(page, query, revision);
  const loading = settledRequest !== requestKey;
  const lastPage = Math.max(1, Math.ceil(total / 10));

  useEffect(() => {
    const controller = new AbortController();
    const effectKey = makeRequestKey(page, query, revision);
    let active = true;
    getNotes({ page, query, signal: controller.signal })
      .then(result => {
        if (!active) return;
        setNotes(result.notes);
        setTotal(result.total);
        setListError('');
        if (!query && page > Math.max(1, Math.ceil(result.total / 10))) setPage(1);
      })
      .catch(error => {
        if (active && error.name !== 'AbortError') setListError(error.message);
      })
      .finally(() => { if (active) setSettledRequest(effectKey); });
    return () => { active = false; controller.abort(); };
  }, [page, query, revision]);

  async function addNote(event) {
    event.preventDefault();
    if (submissionLock.current) return;
    setFormError('');
    setNotice('');
    if (!title.trim()) { setFormError('Saisissez un titre.'); return; }
    submissionLock.current = true;
    setSubmitting(true);
    try {
      const created = await createNote({ title: title.trim(), body, tag: tag.trim() });
      setTitle('');
      setBody('');
      setTag('');
      setNotice('Note créée.');
      if (!query) setPage(created.total === null ? Math.floor(total / 10) + 1 : Math.ceil(created.total / 10));
      setRevision(value => value + 1);
    } catch (error) {
      setFormError(error.message);
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <main className="notes-app">
      <h1>Mes notes</h1>
      <form onSubmit={addNote} aria-label="Créer une note">
        <fieldset disabled={submitting}>
          <legend>Nouvelle note</legend>
          <label htmlFor="note-title">Titre</label>
          <input id="note-title" value={title} onChange={event => setTitle(event.target.value)} required maxLength={160} />
          <label htmlFor="note-body">Contenu</label>
          <textarea id="note-body" value={body} onChange={event => setBody(event.target.value)} maxLength={20000} rows={4} />
          <label htmlFor="note-tag">Tag (facultatif)</label>
          <input id="note-tag" value={tag} onChange={event => setTag(event.target.value)} maxLength={50} />
          <button type="submit">{submitting ? 'Enregistrement…' : 'Ajouter'}</button>
        </fieldset>
        {formError && <p role="alert">{formError}</p>}
        <p role="status">{notice}</p>
      </form>
      <section aria-labelledby="notes-heading">
        <h2 id="notes-heading">Vos notes</h2>
        <label htmlFor="note-search">Rechercher dans les titres</label>
        <input id="note-search" type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
        {loading && <p role="status">Chargement…</p>}
        {!loading && listError && <div role="alert"><p>{listError}</p><button onClick={() => setRevision(value => value + 1)}>Réessayer</button></div>}
        {!loading && !listError && <>
          <p>{total} note{total !== 1 ? 's' : ''}{query ? ' trouvée(s)' : ''}</p>
          {notes.length === 0 && <p>Aucune note à afficher.</p>}
          <ul className="notes-list">
            {notes.map(note => (
              <li key={note.id}>
                <article>
                  <h3>{typeof note.title === 'string' ? note.title : 'Sans titre'}</h3>
                  <p className="note-content">{typeof note.body === 'string' ? note.body : ''}</p>
                  {typeof note.tag === 'string' && note.tag && <p className="note-tag">{note.tag}</p>}
                </article>
              </li>
            ))}
          </ul>
        </>}
        {!query && <nav aria-label="Pagination des notes">
          <button disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Précédent</button>
          <span>Page {page} sur {lastPage}</span>
          <button disabled={loading || page >= lastPage} onClick={() => setPage(value => value + 1)}>Suivant</button>
        </nav>}
      </section>
    </main>
  );
}
