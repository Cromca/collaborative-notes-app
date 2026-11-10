import express from "express";
import cors from "cors";
import fs from "node:fs";

const app = express();
app.use(cors());
app.use(express.json());

const FILE = "notes.json";

function load() {
  if (!fs.existsSync(FILE)) return [];
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}
function save(n) {
  fs.writeFileSync(FILE, JSON.stringify(n, null, 2));
}

app.post("/notes", (req, res) => {
  const d = req.body;
  const n = load();
  const note = { id: n.length + 1, title: d.title, body: d.body, tag: d.tag };
  n.push(note);
  save(n);
  res.status(201).json(note);
});

app.get("/notes", (req, res) => {
  const page = Number(req.query.page) || 1;
  const size = 10;
  const n = load();
  res.json(n.slice(page * size, (page + 1) * size));
});

app.get("/notes/by-tag/:tag", (req, res) => {
  const n = load();
  const l = [];
  for (let i = 0; i < n.length; i++) {
    if (n[i].tag == req.params.tag) l.push(n[i]);
  }
  res.json(l);
});

app.get("/search", (req, res) => {
  const q = req.query.q;
  const n = load();
  res.json(n.filter((x) => x.title.toLowerCase().includes(q.toLowerCase())));
});

app.delete("/notes/:id", (req, res) => {
  const n = load();
  save(n.filter((x) => x.id != req.params.id));
  res.status(204).end();
});

app.listen(3000, () => console.log("API sur http://localhost:3000"));
