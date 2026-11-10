import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../app.js';

async function setup(t, initialNotes) {
  const directory = await mkdtemp(path.join(tmpdir(), 'notes-api-test-'));
  const file = path.join(directory, 'notes.json');
  if (initialNotes !== undefined) await writeFile(file, JSON.stringify(initialNotes));
  const server = createApp({ file }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    const actual = await realpath(directory);
    assert.ok(actual.startsWith(path.join(await realpath(tmpdir()), 'notes-api-test-')));
    await rm(actual, { recursive: true, force: true });
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  const request = (route, options = {}) => fetch(url + route, options);
  const create = fields => request('/notes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
  });
  return { file, request, create };
}

test('pagination returns the first ten notes, then the remainder', async t => {
  const notes = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, title: `Note ${index + 1}` }));
  const { request } = await setup(t, notes);
  const first = await request('/notes');
  assert.equal(first.headers.get('X-Total-Count'), '12');
  assert.deepEqual((await first.json()).map(note => note.id), [1,2,3,4,5,6,7,8,9,10]);
  assert.deepEqual((await (await request('/notes?page=2')).json()).map(note => note.id), [11,12]);
  assert.deepEqual(await (await request('/notes?page=3')).json(), []);
  for (const page of ['0', '-1', '1.5', 'abc', '', 'Infinity', '9007199254740992', '1&page=2']) {
    assert.equal((await request(`/notes?page=${page}`)).status, 400, page);
  }
});

test('deleting and adding notes never duplicates IDs or deletes another note', async t => {
  const { create, request } = await setup(t);
  const originals = [];
  for (let index = 0; index < 3; index++) originals.push(await (await create({ title: `Note ${index}` })).json());
  assert.equal((await request(`/notes/${originals[1].id}`, { method: 'DELETE' })).status, 204);
  const newNote = await (await create({ title: 'Nouvelle note' })).json();
  assert.ok(!originals.some(note => note.id === newNote.id));
  assert.equal((await request(`/notes/${newNote.id}`, { method: 'DELETE' })).status, 204);
  const remaining = await (await request('/notes')).json();
  assert.deepEqual(remaining.map(note => note.id), [originals[0].id, originals[2].id]);
  assert.equal((await request('/notes/unknown', { method: 'DELETE' })).status, 404);
});

test('legacy numeric IDs remain deletable without deleting multiple records', async t => {
  const { request } = await setup(t, [{ id: 3, title: 'A' }, { id: 3, title: 'B' }]);
  assert.equal((await request('/notes/3', { method: 'DELETE' })).status, 204);
  assert.deepEqual(await (await request('/notes')).json(), [{ id: 3, title: 'B' }]);
});

test('invalid note payloads are rejected without changing stored data', async t => {
  const { create, file, request } = await setup(t, [{ id: 1, title: 'Existing' }]);
  const original = await readFile(file, 'utf8');
  const invalid = [{}, {title:42}, {title:''}, {title:'  '}, {title:'a'.repeat(161)},
    {title:'Valid',body:42}, {title:'Valid',body:null}, {title:'Valid',body:'a'.repeat(20001)},
    {title:'Valid',tag:[]}, {title:'Valid',tag:'a'.repeat(51)}, [], null];
  for (const fields of invalid) {
    const response = await create(fields);
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, 'string');
    assert.equal(await readFile(file, 'utf8'), original);
  }
  const badJson = await request('/notes', {method:'POST',headers:{'Content-Type':'application/json'},body:'{broken'});
  assert.equal(badJson.status,400);
  assert.equal(typeof (await badJson.json()).error,'string');
  const huge = await create({ title:'Valid',body:'a'.repeat(110000) });
  assert.equal(huge.status,413);
  assert.equal(typeof (await huge.json()).error,'string');
});

test('search validates q with both empty and nonempty storage and tolerates legacy notes', async t => {
  const { request, file } = await setup(t);
  for (const notes of [[], [{id:1,title:'ÉCOLE Alpha'}, {id:2}, {id:3,title:42}]]) {
    await writeFile(file,JSON.stringify(notes));
    for (const route of ['/search','/search?q=','/search?q=%20','/search?q=a&q=b']) {
      const response = await request(route);
      assert.equal(response.status,400);
      assert.equal(typeof (await response.json()).error,'string');
    }
  }
  const result = await request('/search?q=%20%C3%A9cole%20');
  assert.equal(result.status,200);
  assert.deepEqual((await result.json()).map(note => note.id),[1]);
});

test('tags are filtered strictly and fields are normalized', async t => {
  const { create, request } = await setup(t);
  const response = await create({ title:'  Alpha  ',body:'<b>literal</b>',tag:' audit ' });
  assert.equal(response.status,201);
  const note = await response.json();
  assert.equal(note.title,'Alpha');
  assert.equal(note.tag,'audit');
  assert.equal(note.body,'<b>literal</b>');
  assert.deepEqual(await (await request('/notes/by-tag/audit')).json(),[note]);
  assert.deepEqual(await (await request('/notes/by-tag/other')).json(),[]);
});

test('concurrent writes preserve every note and unique IDs', async t => {
  const { create, file } = await setup(t);
  const responses = await Promise.all(Array.from({length:20},(_,index)=>create({title:`Note ${index}`})));
  assert.ok(responses.every(response=>response.status===201));
  const notes = JSON.parse(await readFile(file,'utf8'));
  assert.equal(notes.length,20);
  assert.equal(new Set(notes.map(note=>note.id)).size,20);
});

test('corrupt storage returns safe JSON, remains intact and can recover', async t => {
  const { request, create, file } = await setup(t,[]);
  await writeFile(file,'{broken');
  for (const response of [await request('/notes'), await create({title:'New'})]) {
    assert.equal(response.status,500);
    const body=await response.json();
    assert.equal(typeof body.error,'string');
    assert.ok(!JSON.stringify(body).includes(file));
  }
  assert.equal(await readFile(file,'utf8'),'{broken');
  await writeFile(file,'[]');
  assert.equal((await create({title:'Recovered'})).status,201);
});
