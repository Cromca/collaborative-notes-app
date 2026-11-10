import { useEffect, useState } from "react";

export default function App() {
  const [notes, setNotes] = useState([]);
  const [q, setQ] = useState("");
  const [t, setT] = useState("");
  const [b, setB] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  // [] : on charge la liste une seule fois, au premier affichage
  useEffect(() => {
    fetch("http://localhost:3000/notes")
      .then((r) => r.json())
      .then((d) => setNotes(d));
  }, []);

  async function add() {
    if (envoi) return; // évite un double envoi pendant la requête
    setEnvoi(true);
    setErreur("");
    try {
      const res = await fetch("http://localhost:3000/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, body: b }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const note = await res.json();
      // on ne vide les champs qu'une fois la note bien créée
      setNotes((liste) => [...liste, note]);
      setT("");
      setB("");
    } catch (e) {
      // le brouillon reste dans les champs pour pouvoir réessayer
      setErreur("La note n'a pas pu être enregistrée (" + e.message + "). Réessaie.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div>
      <h1>Mes notes</h1>
      <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Titre" />
      <textarea value={b} onChange={(e) => setB(e.target.value)} placeholder="Contenu" />
      <button onClick={add} disabled={envoi}>
        {envoi ? "Envoi..." : "Ajouter"}
      </button>
      {erreur && <p role="alert">{erreur}</p>}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" />
      {notes
        .filter((n) => n.title.includes(q))
        .map((n) => (
          <div>
            <h2>{n.title}</h2>
            <p dangerouslySetInnerHTML={{ __html: n.body }} />
          </div>
        ))}
    </div>
  );
}
