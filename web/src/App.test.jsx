import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

function json(data, status=200, total=data.length ?? 0) {
  return new Response(JSON.stringify(data), {status,headers:{'Content-Type':'application/json','X-Total-Count':String(total)}});
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise,resolve};
}
afterEach(() => {
  cleanup();
  if (vi.isFakeTimers()) {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  }
  vi.unstubAllGlobals();
});

describe('notes application', () => {
  it('does not refetch on every render, including StrictMode and form edits', async () => {
    const fetch = vi.fn().mockImplementation(()=>Promise.resolve(json([])));
    vi.stubGlobal('fetch',fetch);
    render(<StrictMode><App /></StrictMode>);
    await screen.findByText('Aucune note à afficher.');
    const initialRequests=fetch.mock.calls.length;
    expect(initialRequests).toBeLessThanOrEqual(2);
    await userEvent.type(screen.getByLabelText('Titre'),'Un brouillon');
    expect(fetch).toHaveBeenCalledTimes(initialRequests);
  });

  it('renders malicious note content as literal text without HTML elements', async () => {
    const payload='<img src=x onerror=alert(1)><b>gras</b>';
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(json([{id:'safe',title:'Test',body:payload}])));
    const {container}=render(<App />);
    await screen.findByText(payload);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it.each(['http','network'])('preserves a draft after a %s failure', async failure => {
    vi.stubGlobal('fetch',vi.fn().mockImplementation((_url,options)=> {
      if(options?.method==='POST') return failure==='http'
        ? Promise.resolve(json({error:'Enregistrement impossible'},500))
        : Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve(json([]));
    }));
    render(<App />);
    await screen.findByText('Aucune note à afficher.');
    await userEvent.type(screen.getByLabelText('Titre'),'À garder');
    await userEvent.type(screen.getByLabelText('Contenu'),'Texte important');
    await userEvent.click(screen.getByRole('button',{name:'Ajouter'}));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Titre').value).toBe('À garder');
    expect(screen.getByLabelText('Contenu').value).toBe('Texte important');
    expect(screen.getByLabelText('Titre').disabled).toBe(false);
  });

  it('blocks duplicate submissions and refreshes the last page only after success', async () => {
    const pending=deferred();
    const created={id:'new',title:'Nouvelle note',body:''};
    const fetch=vi.fn().mockImplementation((url,options)=> {
      if(options?.method==='POST') return pending.promise;
      return Promise.resolve(url.endsWith('page=2')?json([created],200,11):json([{id:'old',title:'Ancienne'}],200,10));
    });
    vi.stubGlobal('fetch',fetch);
    render(<App />);
    await screen.findByText('Ancienne');
    await userEvent.type(screen.getByLabelText('Titre'),'Nouvelle note');
    await userEvent.dblClick(screen.getByRole('button',{name:'Ajouter'}));
    expect(fetch.mock.calls.filter(([,options])=>options?.method==='POST')).toHaveLength(1);
    expect(screen.getByLabelText('Titre').value).toBe('Nouvelle note');
    await act(async()=>pending.resolve(json(created,201)));
    await screen.findByText('Note créée.');
    await screen.findByRole('heading',{name:'Nouvelle note'});
    expect(screen.getByLabelText('Titre').value).toBe('');
    expect(screen.getByText('Page 2 sur 2')).toBeTruthy();
  });

  it('shows later pages and searches through the API rather than only the current page', async () => {
    const fetch=vi.fn().mockImplementation(url=>Promise.resolve(
      url.includes('/search?')?json([{id:'match',title:'Hors page'}]):
      url.endsWith('page=2')?json([{id:'last',title:'Dernière'}],200,12):json([{id:'first',title:'Première'}],200,12)
    ));
    vi.stubGlobal('fetch',fetch);
    render(<App />);
    await screen.findByText('Première');
    await userEvent.click(screen.getByRole('button',{name:'Suivant'}));
    await screen.findByText('Dernière');
    await userEvent.type(screen.getByLabelText('Rechercher dans les titres'),'Hors');
    await screen.findByText('Hors page');
    expect(fetch.mock.calls.at(-1)[0]).toContain('/search?q=Hors');
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('searches once after a pause in typing', async () => {
    const fetch=vi.fn().mockResolvedValue(json([]));
    vi.stubGlobal('fetch',fetch);
    render(<App />);
    await screen.findByText('Aucune note à afficher.');
    vi.useFakeTimers();
    const search = screen.getByLabelText('Rechercher dans les titres');
    fireEvent.change(search, {target: {value: 'no'}});
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    fireEvent.change(search, {target: {value: 'notes'}});
    await act(async () => { await vi.advanceTimersByTimeAsync(299); });
    expect(fetch.mock.calls.filter(([url]) => url.includes('/search?'))).toHaveLength(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(fetch.mock.calls.filter(([url]) => url.includes('/search?'))).toHaveLength(1);
    expect(fetch.mock.calls.find(([url]) => url.includes('/search?'))[0]).toContain('q=notes');
  });

  it('keeps pagination hidden until the full list returns after clearing a search', async () => {
    const pending = deferred();
    const fetch = vi.fn()
      .mockResolvedValueOnce(json([{id: 'first', title: 'Première'}], 200, 12))
      .mockResolvedValueOnce(json([{id: 'match', title: 'Hors page'}]))
      .mockImplementationOnce(() => pending.promise);
    vi.stubGlobal('fetch', fetch);
    render(<App />);
    await screen.findByText('Page 1 sur 2');
    vi.useFakeTimers();
    const search = screen.getByLabelText('Rechercher dans les titres');
    fireEvent.change(search, {target: {value: 'Hors'}});
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(screen.getByText('Hors page')).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();

    fireEvent.change(search, {target: {value: ''}});
    expect(screen.queryByRole('navigation')).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(299); });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('navigation')).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls.at(-1)[0]).toContain('/notes?page=1');
    expect(screen.queryByRole('navigation')).toBeNull();

    await act(async () => { pending.resolve(json([{id: 'first', title: 'Première'}], 200, 12)); });
    expect(screen.getByText('Page 1 sur 2')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Suivant'}).disabled).toBe(false);
  });

  it('ignores a stale search response that arrives after a more recent response', async () => {
    const old=deferred();
    const fetch=vi.fn().mockImplementation(url=> {
      if(url.endsWith('q=a')) return old.promise;
      if(url.endsWith('q=ab')) return Promise.resolve(json([{id:'recent',title:'Récent'}]));
      return Promise.resolve(json([]));
    });
    vi.stubGlobal('fetch',fetch);
    render(<App />);
    await screen.findByText('Aucune note à afficher.');
    const search = screen.getByLabelText('Rechercher dans les titres');
    await userEvent.type(search,'a');
    await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.endsWith('q=a'))).toBe(true));
    await userEvent.type(search,'b');
    await screen.findByText('Récent');
    await act(async()=>old.resolve(json([{id:'old',title:'Périmé'}])));
    expect(screen.queryByText('Périmé')).toBeNull();
    expect(screen.getByText('Récent')).toBeTruthy();
  });

  it('allows retrying a failed list request', async () => {
    const fetch=vi.fn().mockResolvedValueOnce(json({error:'Lecture impossible'},500)).mockResolvedValue(json([]));
    vi.stubGlobal('fetch',fetch);
    render(<App />);
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button',{name:'Réessayer'}));
    await screen.findByText('Aucune note à afficher.');
    await waitFor(()=>expect(screen.queryByRole('alert')).toBeNull());
  });

  it('uses the server insertion count when saving before the initial list arrives', async () => {
    const initial=deferred();
    const note={id:'new',title:'Nouvelle note',body:''};
    const fetch=vi.fn().mockImplementation((url,options)=> {
      if(options?.method==='POST') return Promise.resolve(json(note,201,11));
      if(url.endsWith('page=2')) return Promise.resolve(json([note],200,11));
      return initial.promise;
    });
    vi.stubGlobal('fetch',fetch);
    render(<App />);
    await userEvent.type(screen.getByLabelText('Titre'),'Nouvelle note');
    await userEvent.click(screen.getByRole('button',{name:'Ajouter'}));
    await screen.findByRole('heading',{name:'Nouvelle note'});
    expect(screen.getByText('Page 2 sur 2')).toBeTruthy();
    await act(async()=>initial.resolve(json([{id:'old',title:'Ancienne réponse'}],200,10)));
    expect(screen.queryByText('Ancienne réponse')).toBeNull();
  });
});
