import { useState, useEffect, useCallback } from 'react';
import * as db from './lib/db.js';
import { scaricaBackup } from './lib/esporta.js';
import { stampaSchede } from './lib/stampa.js';
import Home from './screens/Home.jsx';
import Rullino from './screens/Rullino.jsx';
import NuovoRullino from './screens/NuovoRullino.jsx';
import Archivio from './screens/Archivio.jsx';
import Sviluppo from './screens/Sviluppo.jsx';

const V = (n) => `var(--${n})`;

/**
 * App — stato, persistenza, navigazione.
 *
 * ─── Il principio che tiene insieme l'interfaccia ───
 *
 * Le azioni su UN rullino stanno dentro il rullino, nel menu ⋯.
 * La selezione in lista serve solo a fare la stessa cosa su PIU'
 * rullini insieme.
 *
 * Da qui discende tutto il resto: aprendo un rullino dall'Archivio si
 * arriva alla stessa schermata che si apre dalla Home, con lo stesso
 * menu. Chi ha imparato a stampare un rullino in corso sa gia' come
 * stampare un rullino sviluppato.
 *
 * ─── Un vocabolario solo ───
 *
 * Gli stati sono tre e si chiamano allo stesso modo ovunque:
 * IN CORSO → FINITO → SVILUPPATO.
 *
 * La parola "archivia" non esiste piu': non era un'azione ma la
 * conseguenza di uno stato. Un rullino sviluppato si sposta in Archivio
 * da se'. Avere due nomi per la stessa cosa costringeva a impararli
 * entrambi.
 */
export default function App() {
  const [pronto, setPronto] = useState(false);
  const [errore, setErrore] = useState(null);

  const [rullini, setRullini] = useState([]);
  const [conteggi, setConteggi] = useState({});
  const [scatti, setScatti] = useState([]);

  const [vista, setVista] = useState({ nome: 'home' });
  const [selArchivio, setSelArchivio] = useState(null);

  // ─── caricamento ──────────────────────────────────────────

  const ricarica = useCallback(async () => {
    const elenco = await db.getRullini();
    const coppie = await Promise.all(
      elenco.map(async (r) => [r.id, (await db.getScatti(r.id)).length])
    );
    setRullini(elenco);
    setConteggi(Object.fromEntries(coppie));
  }, []);

  /* Nessuna apertura esplicita: db.js apre la connessione da se' alla
     prima query, e main.jsx ha gia' richiesto la persistenza. */
  useEffect(() => {
    ricarica()
      .then(() => setPronto(true))
      .catch(() => { setErrore('Impossibile aprire l\'archivio locale.'); setPronto(true); });
  }, [ricarica]);

  // ─── rullini ──────────────────────────────────────────────

  async function creaRullino(r) {
    await db.saveRullino(r);
    await ricarica();
    setScatti([]);
    setVista({ nome: 'rullino', id: r.id });
  }

  async function apriRullino(id) {
    const s = await db.getScatti(id);
    setScatti(s);
    setVista({ nome: 'rullino', id });
  }

  /** Conserva identita' e storia: cambia solo cio' che il form modifica. */
  async function salvaModifiche(r) {
    await db.saveRullino(r);
    await ricarica();
    setVista({ nome: 'rullino', id: r.id });
  }

  /** Un solo passaggio di stato, usato da ogni punto dell'interfaccia. */
  async function cambiaStato(ids, stato) {
    const ora = new Date().toISOString();
    for (const id of [].concat(ids)) {
      const r = rullini.find((x) => x.id === id);
      if (!r) continue;
      await db.saveRullino({
        ...r,
        stato,
        data_fine: stato === 'in_corso' ? null : (r.data_fine || ora),
      });
    }
    await ricarica();
  }

  /**
   * Salvare lo sviluppo implica che il rullino e' passato per la tanica.
   * Si resta sul rullino: sparire in Home mentre si guardano i dati
   * appena inseriti e' disorientante, e la stampa con quei dati si fa
   * proprio da qui.
   */
  async function salvaSviluppo(id, sv) {
    const r = rullini.find((x) => x.id === id);
    if (!r) return;
    await db.saveRullino({
      ...r,
      sviluppo: sv,
      stato: 'sviluppato',
      data_fine: r.data_fine || new Date().toISOString(),
    });
    await ricarica();
    setVista({ nome: 'rullino', id });
  }

  async function eliminaRullino(id) {
    try {
      await db.deleteRullino(id);
      setScatti([]);
      setVista({ nome: 'home' });
      await ricarica();
    } catch {
      setErrore('Eliminazione non riuscita.');
    }
  }

  // ─── scatti ───────────────────────────────────────────────

  async function registraScatto(s) {
    setScatti((p) => [...p, s]);                    // ottimistico
    setConteggi((p) => ({ ...p, [s.rullino_id]: (p[s.rullino_id] || 0) + 1 }));
    try {
      await db.saveScatto(s);
    } catch {
      setScatti((p) => p.filter((x) => x.id !== s.id));
      setConteggi((p) => ({ ...p, [s.rullino_id]: Math.max(0, (p[s.rullino_id] || 1) - 1) }));
      setErrore('Scatto non salvato. Riprova.');
    }
  }

  async function aggiornaScatto(s) {
    setScatti((p) => p.map((x) => (x.id === s.id ? s : x)));
    await db.saveScatto(s).catch(() => setErrore('Modifica non salvata.'));
  }

  async function eliminaScatto(id) {
    const rimosso = scatti.find((x) => x.id === id);
    setScatti((p) => p.filter((x) => x.id !== id));
    if (rimosso) {
      setConteggi((p) => ({ ...p, [rimosso.rullino_id]: Math.max(0, (p[rimosso.rullino_id] || 1) - 1) }));
    }
    await db.deleteScatto(id).catch(() => setErrore('Eliminazione non riuscita.'));
  }

  // ─── export ───────────────────────────────────────────────

  async function stampa(ids) {
    const coppie = await Promise.all(
      [].concat(ids).map(async (id) => ({
        rullino: rullini.find((r) => r.id === id),
        scatti: await db.getScatti(id),
      }))
    );
    stampaSchede(coppie.filter((c) => c.rullino));
  }

  async function backup() {
    try {
      const d = await scaricaBackup();
      if (!d) setErrore('Backup non riuscito.');
    } catch {
      setErrore('Backup non riuscito.');
    }
  }

  // ─── render ───────────────────────────────────────────────

  if (!pronto) {
    return (
      <div style={{ padding: 16, paddingTop: '35vh' }}>
        <p style={{ textAlign: 'center', color: V('on-surface-var') }}>Apertura archivio…</p>
      </div>
    );
  }

  const attivo = rullini.find((r) => r.id === vista.id);
  const attivi = rullini.filter((r) => r.stato !== 'sviluppato');
  const archiviati = rullini.filter((r) => r.stato === 'sviluppato');

  /* Le stesse azioni ovunque: quale schermata le ha chiamate non cambia
     cosa fanno. E' la ragione per cui il menu del rullino e' identico
     aprendolo dalla Home o dall'Archivio. */
  const azioniRullino = attivo ? {
    onCambiaStato: (st) => cambiaStato(attivo.id, st),
    onStampa: () => stampa(attivo.id),
    onSviluppo: () => setVista({ nome: 'sviluppo', id: attivo.id }),
    onModifica: () => setVista({ nome: 'modifica', id: attivo.id }),
    onEliminaRullino: () => eliminaRullino(attivo.id),
  } : {};

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>

      {errore && (
        <div role="alert" style={{
          background: V('critical'), color: V('on-critical'),
          padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontSize: 14 }}>{errore}</span>
          <button onClick={() => setErrore(null)} style={{
            background: 'transparent', color: 'inherit', minHeight: 40,
            padding: '0 8px', fontSize: 18,
          }}>&#10005;</button>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>

        {vista.nome === 'home' && (
          <Home
            rullini={attivi}
            conteggi={conteggi}
            nArchiviati={archiviati.length}
            onApri={apriRullino}
            onNuovo={() => setVista({ nome: 'nuovo' })}
            onSviluppati={(ids) => cambiaStato(ids, 'sviluppato')}
            onStampa={stampa}
            onArchivio={() => setVista({ nome: 'archivio' })}
            onBackup={backup}
          />
        )}

        {vista.nome === 'rullino' && attivo && (
          <Rullino
            rullino={attivo}
            scatti={scatti}
            onRegistra={registraScatto}
            onAggiorna={aggiornaScatto}
            onElimina={eliminaScatto}
            onIndietro={() => setVista({
              nome: attivo.stato === 'sviluppato' ? 'archivio' : 'home',
            })}
            {...azioniRullino}
          />
        )}

        {vista.nome === 'archivio' && (
          <Archivio
            rullini={archiviati}
            conteggi={conteggi}
            selezione={selArchivio}
            setSelezione={setSelArchivio}
            onApri={apriRullino}
            onRiporta={(ids) => cambiaStato(ids, 'finito')}
            onStampa={stampa}
            onIndietro={() => { setSelArchivio(null); setVista({ nome: 'home' }); }}
          />
        )}

        {vista.nome === 'sviluppo' && attivo && (
          <Sviluppo
            rullino={attivo}
            onSalva={(sv) => salvaSviluppo(attivo.id, sv)}
            onIndietro={() => setVista({ nome: 'rullino', id: attivo.id })}
          />
        )}

        {vista.nome === 'modifica' && attivo && (
          <NuovoRullino
            rullino={attivo}
            onCrea={salvaModifiche}
            onIndietro={() => setVista({ nome: 'rullino', id: attivo.id })}
          />
        )}

        {vista.nome === 'nuovo' && (
          <NuovoRullino
            ultimo={rullini[0]}
            tuttiRullini={rullini}
            onCrea={creaRullino}
            onIndietro={() => setVista({ nome: 'home' })}
          />
        )}
      </div>
    </div>
  );
}
