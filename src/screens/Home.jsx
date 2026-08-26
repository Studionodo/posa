import { useState, useRef, useLayoutEffect } from 'react';
import {
  Chip, StrisciaPellicola, FotogrammaVuoto, Perforazione,
  PulsanteAzione, Sfumatura,
} from '../components/components.jsx';
import {
  etichettaPushPull, riconosciZoom, ETICHETTE_STATO, ETICHETTE_FORMATO,
} from '../lib/model.js';

const V = (n) => `var(--${n})`;

/**
 * Home — i rullini che hai per le mani.
 *
 * Mostra solo in corso e finiti: gli sviluppati stanno in Archivio.
 *
 * La selezione non aggiunge azioni nuove, fa le stesse cose su piu'
 * rullini insieme. Per questo il pulsante si chiama SVILUPPATO come lo
 * stato dentro il rullino, non "archivia": due nomi per la stessa cosa
 * costringono a impararli entrambi.
 */
export default function Home({
  rullini, conteggi, nArchiviati,
  onApri, onNuovo, onSviluppati, onStampa, onArchivio, onBackup,
}) {
  const [selezione, setSelezione] = useState(null);
  const [filtro, setFiltro] = useState('tutti');

  const inSelezione = selezione !== null;

  /* Il filtro e' uno stato persistente, non un'azione: deve dichiararsi
     da solo. Un'icona lo nasconderebbe, e riaprendo l'app domani si
     vedrebbe una lista incompleta senza capire perche'. */
  const perStato = {
    in_corso: rullini.filter((r) => r.stato === 'in_corso').length,
    finito: rullini.filter((r) => r.stato === 'finito').length,
  };
  const serveFiltro = perStato.in_corso > 0 && perStato.finito > 0;
  const visibili = (serveFiltro && filtro !== 'tutti')
    ? rullini.filter((r) => r.stato === filtro)
    : rullini;

  const tuttiScelti = inSelezione
    && selezione.length > 0
    && selezione.length === visibili.length;

  /* Portare a sviluppato un rullino ancora in corso e' quasi sempre uno
     sbaglio: si avvisa, non si blocca. La decisione resta al fotografo,
     come per il superamento delle pose nominali. */
  const inCorsoScelti = inSelezione
    ? selezione.filter((id) => rullini.find((r) => r.id === id)?.stato === 'in_corso').length
    : 0;

  function tocca(r) {
    if (!inSelezione) { onApri(r.id); return; }
    setSelezione((p) => p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]);
  }

  /* La sfumatura in alto dice "sopra c'e' altro": ha senso solo quando
     la lista scorre davvero. Con un rullino solo restava comunque
     accesa e mangiava la parte alta dell'unica card visibile — un
     effetto pensato per la lista piena che diventava un difetto nella
     lista corta. Si misura il contenuto reale invece di indovinare una
     soglia sul numero di rullini, perche' l'altezza delle card cambia
     con push/pull, chip e chiusura. */
  const scrollRef = useRef(null);
  const [scorre, setScorre] = useState(false);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScorre(el.scrollHeight > el.clientHeight + 1);
  }, [visibili.length, inSelezione]);

  const iconaHeader = {
    width: 44, minHeight: 44, marginTop: 2, borderRadius: V('r-full'),
    background: V('surf-cont-high'), color: V('primary'), fontSize: 19,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  /* Icona con la parola sotto: il simbolo da solo si presta a essere
     letto per quello che non e' — il segno della selezione veniva
     scambiato per una stampante. Dieci pixel di testo tolgono il dubbio. */
  function IconaEtichetta({ simbolo, testo, onClick }) {
    return (
      <button onClick={onClick} style={{
        minHeight: 64, width: 56, padding: 0, background: 'transparent',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      }}>
        <span aria-hidden="true" style={{
          width: 44, height: 44, borderRadius: V('r-full'),
          background: V('surf-cont-high'), color: V('primary'), fontSize: 19,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{simbolo}</span>
        <span style={{
          fontSize: 9, letterSpacing: '0.09em', fontWeight: 600,
          color: V('on-surface-var'),
        }}>{testo}</span>
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <header style={{ padding: '24px 16px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h1 className="marchio" style={{ margin: 0 }}>
              Posa<span className="marchio-punto">.</span>
            </h1>
            <p style={{
              color: V('on-surface-var'), fontSize: 14, fontStyle: 'italic', margin: '4px 0 0',
            }}>Prima che la leva avanzi.</p>
            {/* Descrizione dell'app raggiungibile dall'header: cosa fa,
                in italiano e inglese, senza obiettivi o cose da fare —
                quelle appartengono all'handover, non a chi usa l'app. */}
            <a href="/about.html" style={{
              display: 'inline-block', marginTop: 6, color: V('on-surface-var'),
              fontSize: 12, letterSpacing: '0.04em', textDecoration: 'underline',
              textUnderlineOffset: 3, opacity: 0.75,
            }}>Cos'è Posa</a>
          </div>

          {!inSelezione ? (
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {rullini.length > 0 && (
                <IconaEtichetta simbolo="&#10003;" testo="SCEGLI"
                  onClick={() => setSelezione([])} />
              )}
              {nArchiviati > 0 && (
                <IconaEtichetta simbolo="&#9636;" testo="ARCHIVIO"
                  onClick={onArchivio} />
              )}
            </div>
          ) : (
            /* Un elemento, due funzioni: seleziona tutti ed e' il
               contatore. Tornando dal laboratorio con cinque rullini si
               chiude in due tap invece di sei. */
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'flex-start' }}>
              <button onClick={() => setSelezione(tuttiScelti ? [] : visibili.map((r) => r.id))}
                style={{
                  minHeight: 44, marginTop: 2, padding: '0 16px', borderRadius: V('r-full'),
                  background: tuttiScelti ? V('primary-tint') : V('surf-cont-high'),
                  color: V('primary'),
                  boxShadow: tuttiScelti ? `inset 0 0 0 1.5px ${V('primary')}` : 'none',
                  fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap',
                }}>
                {selezione.length ? `${selezione.length} di ${visibili.length}` : 'Tutti'}
              </button>
              <button onClick={() => setSelezione(null)} aria-label="Annulla selezione"
                style={{ ...iconaHeader, background: V('surf-cont'), color: V('on-surface-var') }}>
                &#10005;
              </button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, opacity: 0.5 }}>
          <Perforazione colore={V('surf-cont-high')} n={18} alt={7} gap={7} pad="0" />
        </div>

        {serveFiltro && !inSelezione && (
          <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
            {[
              ['tutti', 'Tutti', rullini.length],
              ['in_corso', 'In corso', perStato.in_corso],
              ['finito', 'Finiti', perStato.finito],
            ].map(([chiave, etichetta, n]) => {
              const on = filtro === chiave;
              return (
                <button key={chiave} onClick={() => setFiltro(chiave)} aria-pressed={on}
                  style={{
                    minHeight: 40, padding: '0 14px', borderRadius: V('r-full'),
                    background: on ? V('primary-tint') : V('surf-cont'),
                    color: on ? V('primary') : V('on-surface-var'),
                    boxShadow: on ? `inset 0 0 0 1.5px ${V('primary')}` : 'none',
                    fontFamily: V('corpo'), fontSize: 13, fontWeight: on ? 600 : 400,
                    letterSpacing: '0.04em',
                  }}>
                  {etichetta}<span style={{ opacity: 0.6, marginLeft: 6 }}>{n}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {scorre && <Sfumatura verso="basso" altezza={28} />}
        <div ref={scrollRef} style={{ height: '100%', overflowY: 'auto', padding: '0 16px' }}>

          {!visibili.length && (
            <FotogrammaVuoto>
              {rullini.length
                ? 'Nessun rullino con questo filtro.'
                : <>Nessun rullino.<br />Caricane uno per cominciare.</>}
            </FotogrammaVuoto>
          )}

          {visibili.map((r) => {
            const n = conteggi[r.id] || 0;
            const push = etichettaPushPull(r);
            const chiuso = r.stato !== 'in_corso';
            const scelto = inSelezione && selezione.includes(r.id);

            return (
              <button key={r.id} onClick={() => tocca(r)} style={{
                display: 'block', width: '100%', textAlign: 'left', marginBottom: 8,
                padding: 16, borderRadius: V('r-xl'),
                background: scelto ? V('surf-cont-highest') : (chiuso ? V('surf-cont-low') : V('surf-cont')),
                color: chiuso && !scelto ? V('on-surface-var') : V('on-surface'),
                outline: scelto ? `2px solid ${V('primary')}` : 'none',
                outlineOffset: -2,
                /* Filetto chiaro sul bordo alto: e' come si comporta la
                   luce vera, e da' rilievo senza ombre — che su fondo
                   scuro fanno sporco invece di profondita'. */
                boxShadow: `inset 0 1px 0 ${V('luce-alto')}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <span className="display" style={{
                    fontSize: 19, fontWeight: 600, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{r.nome}</span>
                  <span className="display" style={{
                    fontSize: 21, fontWeight: 700, flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                    color: chiuso ? V('on-surface-var') : V('primary'),
                  }}>{n}/{r.pose_totali}</span>
                </div>

                <div style={{ color: V('on-surface-var'), fontSize: 14, marginTop: 4 }}>
                  {[r.pellicola, ETICHETTE_FORMATO[r.formato] || r.formato, r.corpo].filter(Boolean).join(' \u00b7 ')}
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {push && <Chip pieno>{push}</Chip>}
                  {riconosciZoom(r.obiettivo) && <Chip>zoom</Chip>}
                  {chiuso && <Chip>{ETICHETTE_STATO[r.stato]}</Chip>}
                </div>

                <StrisciaPellicola totali={r.pose_totali} fatti={n} spento={chiuso} />
              </button>
            );
          })}

          {rullini.length > 0 && !inSelezione && (
            <button onClick={onBackup} style={{
              display: 'block', width: '100%', minHeight: 48, marginTop: 4,
              background: 'transparent', color: V('on-surface-var'),
              fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3,
            }}>Salva un backup dell'archivio</button>
          )}
          <div style={{ height: 8 }} />
        </div>
      </div>

      {inSelezione ? (
        <div style={{
          flexShrink: 0, position: 'relative',
          padding: '8px 16px calc(16px + env(safe-area-inset-bottom))',
        }}>
          <Sfumatura />

          {/* Le stesse due colonne dell'Archivio: a sinistra il passaggio
              di stato, a destra la stampa. Cambia solo la direzione. */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={!selezione.length}
              onClick={() => { onSviluppati(selezione); setSelezione(null); }}
              style={{
                flex: 1, minHeight: 62, borderRadius: V('r-full'),
                background: selezione.length ? V('azione') : V('surf-cont'),
                color: selezione.length ? V('on-azione') : V('on-surface-var'),
                fontFamily: V('display'), fontSize: 17, fontWeight: 700, letterSpacing: '0.05em',
              }}>SVILUPPATO</button>

            <button disabled={!selezione.length}
              onClick={() => { onStampa(selezione); setSelezione(null); }}
              style={{
                width: 86, minHeight: 62, borderRadius: V('r-full'),
                background: V('surf-cont-high'),
                color: selezione.length ? V('on-surface') : V('on-surface-var'),
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 2,
              }}>
              <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden="true">&#9113;</span>
              <span style={{ fontSize: 10, letterSpacing: '0.1em', fontWeight: 600 }}>STAMPA</span>
            </button>
          </div>

          {inCorsoScelti > 0 && (
            <div style={{ marginTop: 10, textAlign: 'center', color: V('critical'), fontSize: 13 }}>
              {inCorsoScelti === 1
                ? 'Un rullino non \u00e8 ancora finito'
                : `${inCorsoScelti} rullini non sono ancora finiti`}
            </div>
          )}
        </div>
      ) : (
        <>
          <PulsanteAzione onClick={onNuovo} paddingBasso={0}>CARICA</PulsanteAzione>

          {/* Il blocco sotto CARICA aveva quattro righe di testo alla
              stessa altezza visiva — Ko-fi, privacy, filetto, copyright —
              che si leggevano come un'unica massa indistinta invece che
              come sezioni separate. Il problema non era "poco spazio", era
              gerarchia piatta: nessun elemento pesava piu' degli altri.

              Ora Ko-fi resta un invito a se', staccato dal resto da un
              margine reale. Privacy e copyright si compattano in un solo
              blocco "informazioni" — stessa dimensione, stessa opacita',
              separati da un punto invece che impilati su righe diverse:
              si leggono come una singola nota a pie' di pagina, non come
              due argomenti diversi. */}
          <div style={{
            textAlign: 'center', flexShrink: 0,
            padding: '4px 16px calc(20px + env(safe-area-inset-bottom))',
          }}>
            <a href="https://ko-fi.com/istantelabs/tip"
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                color: V('primary'), fontFamily: V('corpo'),
                fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
                fontWeight: 600, textDecoration: 'none', padding: '8px 12px',
              }}>
              <span style={{ fontSize: 13 }} aria-hidden="true">&#9749;</span>
              Offrimi un caff&egrave;
            </a>

            <div style={{
              fontSize: 10.5, letterSpacing: '0.03em', lineHeight: 1.7,
              color: V('on-surface-var'), opacity: 0.55, marginTop: 14,
            }}>
              Offline &middot; Nessun account &middot; Nessun dato raccolto
              <br />
              &copy; 2026 Studionodo &middot; Tutti i diritti riservati
            </div>
          </div>
        </>
      )}
    </div>
  );
}
