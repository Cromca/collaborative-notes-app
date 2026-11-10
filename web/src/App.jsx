import { useEffect, useState } from "react";

export default function App() {
  const [notes, setNotes] = useState([]);
  const [q, setQ] = useState("");
  const [t, setT] = useState("");
  const [b, setB] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/notes")
      .then((r) => r.json())
      .then((d) => setNotes(d));
  });

  function add() {
    fetch("http://localhost:3000/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t, body: b }),
    });
    setT("");
    setB("");
  }

  return (
    <div>
      <h1>Mes notes</h1>
      <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Titre" />
      <textarea value={b} onChange={(e) => setB(e.target.value)} placeholder="Contenu" />
      <button onClick={add}>Ajouter</button>
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
