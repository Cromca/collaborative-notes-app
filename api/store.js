import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export function createNoteStore(file) {
  let pendingWrite = Promise.resolve();

  async function load() {
    try {
      const notes = JSON.parse(await readFile(file, 'utf8'));
      if (!Array.isArray(notes) || notes.some(note => !note || typeof note !== 'object')) {
        throw new Error('Format de stockage invalide');
      }
      return notes;
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  async function save(notes) {
    const temporaryFile = `${file}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryFile, JSON.stringify(notes, null, 2), 'utf8');
      await rename(temporaryFile, file);
    } finally {
      await unlink(temporaryFile).catch(error => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  }

  function update(change) {
    const operation = pendingWrite.then(async () => {
      const notes = await load();
      const result = change(notes);
      if (result.changed) await save(notes);
      return result.value;
    });
    pendingWrite = operation.catch(() => {});
    return operation;
  }

  return {
    async list() {
      await pendingWrite;
      return load();
    },
    create(fields) {
      return update(notes => {
        const note = { id: randomUUID(), ...fields };
        notes.push(note);
        return { changed: true, value: { note, total: notes.length } };
      });
    },
    remove(id) {
      return update(notes => {
        // Preserve support for numeric IDs from the original application.
        const index = notes.findIndex(note => String(note.id) === id);
        if (index < 0) return { changed: false, value: false };
        notes.splice(index, 1);
        return { changed: true, value: true };
      });
    },
  };
}
