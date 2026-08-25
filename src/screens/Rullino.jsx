import { useState, useMemo, useRef, useEffect } from 'react';
import { Contatore, PulsanteTondo, ListaScatti, Sfumatura } from '../components/components.jsx';
import { Selettore, VoceParametro } from '../components/selettore.jsx';
import {
  TEMPI, DIAFRAMMI, focaliPerRullino, riconosciZoom, nuovoScatto,
  prossimoNumero, ultimiValori, formattaTempo, etichettaPushPull,
  STATI_MANUALI, ETICHETTE_STATO, correzioneReciprocita, FILTRI, filtroDa,
  sviluppoCompilato,
} from '../lib/model.js';

const V = (n) => `var(--${n})`;

/**
 * Rullino — l'unico posto dove stanno tutte le azioni su un rullino.
 *
 * Si arriva qui sia dalla Home sia dall'Archivio, e in entrambi i casi
 * il menu ⋯ e' identico: chi ha imparato a stampare un rullino in corso
 * sa gia' come stampare un rullino sviluppato.
 *
 * ─── Perche' voci e non griglie ───
 *
 * Le griglie sempre aperte riempivano lo schermo di quadrati e
 * costringevano a scorrere. Ora ogni parametro e' una riga che mostra
 * il proprio valore: si legge "Tempo 1/125" invece di dover cercare
 * quale cella e' accesa. Toccandola sale un selettore che si chiude da
 * solo alla scelta.
 *
 * Costa un tap in piu' quando si cambia valore, zero quando non si
 * cambia. In cambio la schermata sta tutta in uno sguardo e resta spazio
 * per parametri che prima non entravano.
 *
 * ─── Layout ───
 *
 * Fotogramma in alto, parametri al centro, schede e azione in fondo.
 */
export default function Rullino({
  rullino, scatti,
  onRegistra, onAggiorna, onElimina,
  onCambiaStato, onStampa, onSviluppo, onModifica, onEliminaRullino, onIndietro,
}) {
  const ordinati = useMemo(
    () => [...scatti].sort((a, b) => a.numero - b.numero),
    [scatti]
  );
  const focali = useMemo(() => focaliPerRullino(rullino), [rullino]);
  const iniziali = useMemo(() => ultimiValori(ordinati), [ordinati]);

  const [scheda, setScheda] = useState('esposizione');
  const [tempo, setTempo] = useState(iniziali.tempo);
  const [diaframma, setDiaframma] = useState(iniziali.diaframma);
  const [focale, setFocale] = useState(iniziali.focale || focali[0]);
  const [nota, setNota] = useState('');
  const [filtro, setFiltro] = useState(iniziali.filtro || '');
  const [aperto, setAperto] = useState(null);
  const [timer, setTimer] = useState(null);
  const [inModifica, setInModifica] = useState(null);
  const [pulse, setPulse] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confermaElimina, setConfermaElimina] = useState(false);

  const scrollRef = useRef(null);

  /* Conteggio per le pose lunghe: apri l'otturatore, avvii, l'app conta.
     Senza, la correzione di reciprocita' resta a meta' — dice quanto
     esporre ma lascia a contare a mente col freddo nelle mani. */
  useEffect(() => {
    if (timer === null || timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const prossimo = prossimoNumero(ordinati);
  const push = etichettaPushPull(rullino);
  const conFocale = focali.length > 1;
  const recip = useMemo(
    () => correzioneReciprocita(tempo, rullino.pellicola),
    [tempo, rullino.pellicola]
  );
  const filtroAttivo = filtroDa(filtro);

  function registra() {
    if (inModifica) {
      onAggiorna({
        ...inModifica, tempo, diaframma,
        focale: conFocale ? focale : inModifica.focale,
        nota, filtro,
      });
      setInModifica(null);
      setNota('');
      return;
    }
    onRegistra(nuovoScatto(rullino.id, prossimo, {
      tempo, diaframma,
      focale: conFocale ? focale : (focali[0] || ''),
      nota, filtro,
    }));
    setNota('');
    setPulse(true);
    setTimeout(() => setPulse(false), 300);
  }

  function apriModifica(s) {
    setScheda('esposizione');
    setInModifica(s);
    setTempo(s.tempo);
    setDiaframma(s.diaframma);
    setFocale(s.focale || focali[0]);
    setNota(s.nota || '');
    setFiltro(s.filtro || '');
  }

  function elimina(id) {
    if (inModifica?.id === id) { setInModifica(null); setNota(''); }
    onElimina(id);
  }

  function chiudiMenu() { setMenu(false); setConfermaElimina(false); }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <header style={{ flexShrink: 0, padding: '10px 12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PulsanteTondo onClick={onIndietro} etichetta="Torna indietro">&#8592;</PulsanteTondo>
          <div style={{ minWidth: 0, flex: 1, paddingLeft: 4 }}>
            <div className="display" style={{
              fontSize: 19, fontWeight: 600, lineHeight: 1.15,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{rullino.nome}</div>
            <div style={{
              fontSize: 13, color: V('on-surface-var'), marginTop: 2,
              display: 'flex', alignItems: 'center', gap: 7,
              overflow: 'hidden', whiteSpace: 'nowrap',
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {[rullino.pellicola, `EI ${rullino.iso_esposizione}`].filter(Boolean).join(' \u00b7 ')}
              </span>
              {push && (
                <span style={{
                  flexShrink: 0, color: V('primary'), fontWeight: 600,
                  letterSpacing: '0.05em', fontSize: 12,
                }}>{push}</span>
              )}
            </div>
          </div>
          <PulsanteTondo onClick={() => menu ? chiudiMenu() : setMenu(true)}
            etichetta="Altre azioni">&#8943;</PulsanteTondo>
        </div>
      </header>

      <Contatore
        compatto
        fatti={ordinati.length}
        totali={rullino.pose_totali}
        pulse={pulse}
        tempo={tempo}
        diaframma={diaframma}
        focale={conFocale ? focale : null}
        formattaTempo={formattaTempo}
      />

      {menu && (
        <div style={{
          margin: '0 16px 8px', padding: '18px 18px 14px',
          borderRadius: V('r-xl'), background: V('surf-cont-low'), flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10, gap: 12,
          }}>
            <span style={{
              fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
              color: V('on-surface-var'), fontWeight: 400, opacity: 0.85,
            }}>Stato del rullino</span>
            <button onClick={chiudiMenu} aria-label="Chiudi" style={{
              width: 40, height: 40, minHeight: 40, borderRadius: V('r-full'),
              background: V('surf-cont'), color: V('on-surface-var'),
              fontSize: 15, flexShrink: 0, marginTop: -4, marginRight: -4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>&#10005;</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
            {STATI_MANUALI.map((st) => {
              const on = st === rullino.stato;
              return (
                <button key={st} onClick={() => onCambiaStato(st)} style={{
                  minHeight: 56,
                  background: on ? V('primary-tint') : V('surf-cont'),
                  color: on ? V('primary') : V('on-surface'),
                  boxShadow: on ? `inset 0 0 0 1.5px ${V('primary')}` : 'none',
                  borderRadius: on ? V('r-xl') : V('r-md'),
                  transform: on ? 'scale(1.04)' : 'scale(1)',
                  fontSize: 14, fontWeight: on ? 600 : 400,
                }}>{ETICHETTE_STATO[st]}</button>
              );
            })}
          </div>

          <div style={{ height: 1, background: V('surf-cont-high'), margin: '18px -18px 6px' }} />

          {[
            { sim: '\u270E', t: 'Modifica il rullino', a: onModifica },
            {
              sim: '\u25D0',
              t: sviluppoCompilato(rullino.sviluppo) ? 'Modifica lo sviluppo' : 'Registra lo sviluppo',
              a: onSviluppo,
              accento: !sviluppoCompilato(rullino.sviluppo),
            },
            { sim: '\u2399', t: 'Stampa la scheda', a: onStampa },
          ].map(({ sim, t, a, accento }) => (
            <button key={t} onClick={() => { chiudiMenu(); a(); }} style={{
              width: '100%', minHeight: 56, borderRadius: V('r-lg'),
              background: 'transparent', color: V('on-surface'),
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '0 4px', fontSize: 15, textAlign: 'left',
            }}>
              <span aria-hidden="true" style={{
                width: 26, flexShrink: 0, textAlign: 'center', fontSize: 17,
                color: accento ? V('primary') : V('on-surface-var'),
              }}>{sim}</span>
              <span style={{ flex: 1 }}>{t}</span>
              {accento && (
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: V('primary'), flexShrink: 0, marginRight: 4,
                }} />
              )}
            </button>
          ))}

          <div style={{ height: 1, background: V('surf-cont-high'), margin: '6px -18px 6px' }} />

          {!confermaElimina ? (
            <button onClick={() => setConfermaElimina(true)} style={{
              width: '100%', minHeight: 56, borderRadius: V('r-lg'),
              background: 'transparent', color: V('critical'),
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '0 4px', fontSize: 15, textAlign: 'left',
            }}>
              <span aria-hidden="true" style={{
                width: 26, flexShrink: 0, textAlign: 'center', fontSize: 17,
              }}>&#10005;</span>
              <span>Elimina il rullino</span>
            </button>
          ) : (
            <div style={{ marginTop: 6, padding: 14, borderRadius: V('r-lg'), background: V('surf-cont') }}>
              <div style={{ fontSize: 14, lineHeight: 1.45, marginBottom: 12 }}>
                Elimini <strong>{rullino.nome}</strong> e i suoi {ordinati.length}{' '}
                {ordinati.length === 1 ? 'scatto' : 'scatti'}.
                <span style={{ color: V('critical') }}> Non si torna indietro.</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfermaElimina(false)} style={{
                  flex: 1, minHeight: 52, borderRadius: V('r-full'),
                  background: V('surf-cont-highest'), color: V('on-surface'),
                  fontSize: 14, fontWeight: 600, letterSpacing: '0.04em',
                }}>Annulla</button>
                <button onClick={onEliminaRullino} style={{
                  flex: 1, minHeight: 52, borderRadius: V('r-full'),
                  background: V('critical'), color: V('on-critical'),
                  fontSize: 14, fontWeight: 600, letterSpacing: '0.04em',
                }}>Elimina</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Sfumatura verso="basso" altezza={18} />

        {menu && (
          <div onClick={chiudiMenu} style={{ position: 'absolute', inset: 0, zIndex: 2 }} />
        )}

        <div ref={scrollRef} style={{ height: '100%', overflowY: 'auto' }}>

          {scheda === 'esposizione' && (
            <div style={{ padding: '6px 16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>

              {inModifica && (
                <div style={{
                  padding: '12px 16px', borderRadius: V('r-lg'),
                  background: V('surf-cont-highest'), color: V('primary'), fontSize: 14,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}>
                  <span>Modifica posa {inModifica.numero}</span>
                  <button onClick={() => { setInModifica(null); setNota(''); }} style={{
                    background: V('surf-cont-highest'), color: V('on-surface'),
                    minHeight: 40, padding: '0 18px', borderRadius: V('r-full'),
                    fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', flexShrink: 0,
                  }}>Annulla</button>
                </div>
              )}

              <VoceParametro etichetta="Tempo" valore={formattaTempo(tempo)}
                onClick={() => setAperto('tempo')} />

              <VoceParametro etichetta="Diaframma" valore={`f/${diaframma}`}
                onClick={() => setAperto('diaframma')} />

              {conFocale && (
                <VoceParametro
                  etichetta={riconosciZoom(rullino.obiettivo) ? 'Focale \u2014 zoom' : 'Focale'}
                  valore={focale} suffisso="mm"
                  onClick={() => setAperto('focale')} />
              )}

              <VoceParametro etichetta="Filtro" valore={filtroAttivo.nome}
                suffisso={filtroAttivo.stop > 0 ? `+${filtroAttivo.stop} stop` : null}
                accento={!!filtro}
                onClick={() => setAperto('filtro')} />

              {/* Sopra il secondo la pellicola perde sensibilita' in modo
                  non lineare: senza correzione si sottoespone, e ci si
                  accorge solo dopo lo sviluppo. */}
              {recip && (
                <div style={{
                  marginTop: 4, padding: '14px 18px', borderRadius: V('r-lg'),
                  background: V('surf-cont-highest'),
                }}>
                  <div style={{
                    fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: V('primary'), fontWeight: 600, marginBottom: 6,
                  }}>Reciprocit&agrave;</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ color: V('on-surface-var'), fontSize: 15 }}>
                      {recip.misurato} misurati &rarr;
                    </span>
                    <span className="display" style={{
                      fontSize: 26, fontWeight: 700, color: V('primary'),
                      fontVariantNumeric: 'tabular-nums',
                    }}>{recip.corretto}</span>
                    <span style={{ color: V('on-surface-var'), fontSize: 13 }}>+{recip.stop} stop</span>
                  </div>
                  {recip.nota && (
                    <div style={{ color: V('on-surface-var'), fontSize: 12, marginTop: 6 }}>{recip.nota}</div>
                  )}
                  {recip.ignota && (
                    <div style={{ color: V('on-surface-var'), fontSize: 12, marginTop: 6 }}>
                      Emulsione non riconosciuta: stima prudente da bianco e nero tradizionale.
                    </div>
                  )}

                  {timer === null ? (
                    <button onClick={() => setTimer(Math.round(recip.secondi))} style={{
                      width: '100%', minHeight: 52, marginTop: 12, borderRadius: V('r-full'),
                      background: V('primary'), color: V('on-primary'),
                      fontFamily: V('display'), fontSize: 16, fontWeight: 700, letterSpacing: '0.04em',
                    }}>AVVIA IL CONTEGGIO</button>
                  ) : (
                    <div style={{ marginTop: 12 }}>
                      <div className="display" style={{
                        textAlign: 'center', fontSize: 42, fontWeight: 700,
                        color: timer > 0 ? V('primary') : V('critical'),
                        fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
                      }}>{timer > 0 ? timer + '\u2033' : 'CHIUDI'}</div>
                      <button onClick={() => setTimer(null)} style={{
                        width: '100%', minHeight: 48, marginTop: 8, borderRadius: V('r-full'),
                        background: V('surf-cont-high'), color: V('on-surface'), fontSize: 14,
                      }}>{timer > 0 ? 'Annulla' : 'Chiudi'}</button>
                    </div>
                  )}
                </div>
              )}

              <input value={nota} onChange={(e) => setNota(e.target.value)}
                placeholder="Nota — soggetto, luce, intenzione"
                style={{ background: V('surf-cont-low'), minHeight: 56, marginTop: 2 }} />
            </div>
          )}

          {scheda === 'scatti' && (
            <div style={{ padding: '4px 16px 16px' }}>
              <ListaScatti
                scatti={ordinati}
                onModifica={apriModifica}
                onElimina={elimina}
                formattaTempo={formattaTempo}
              />
            </div>
          )}
        </div>
      </div>

      {/* ─── piede: schede e azione ──────────────────────────── */}
      <div style={{
        flexShrink: 0, position: 'relative',
        padding: '8px 16px calc(14px + env(safe-area-inset-bottom))',
      }}>
        <Sfumatura altezza={20} />

        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {[
            ['esposizione', 'Esposizione'],
            ['scatti', `Scatti${ordinati.length ? ' ' + ordinati.length : ''}`],
          ].map(([k, et]) => {
            const on = scheda === k;
            return (
              <button key={k} onClick={() => setScheda(k)} style={{
                flex: 1, minHeight: 40, borderRadius: V('r-full'),
                background: on ? V('surf-cont-high') : 'transparent',
                color: on ? V('on-surface') : V('on-surface-var'),
                fontSize: 13, fontWeight: on ? 600 : 400, letterSpacing: '0.03em',
              }}>{et}</button>
            );
          })}
        </div>

        {/* Piu' basso di prima: 60px restano un bersaglio ampio, e i
            pixel recuperati vanno alle voci sopra. */}
        <button onClick={registra} style={{
          width: '100%', minHeight: 62, borderRadius: V('r-full'),
          background: inModifica ? V('primary') : V('azione'),
          color: inModifica ? V('on-primary') : V('on-azione'),
          fontFamily: V('display'), fontSize: 20, fontWeight: 700, letterSpacing: '0.06em',
        }}>
          {inModifica ? `SALVA ${inModifica.numero}` : `REGISTRA ${prossimo}`}
        </button>
      </div>

      {aperto === 'tempo' && (
        <Selettore titolo="Tempo di posa" valori={TEMPI} valore={tempo} formatta={formattaTempo}
          onScegli={setTempo} onChiudi={() => setAperto(null)} />
      )}
      {aperto === 'diaframma' && (
        <Selettore titolo="Diaframma" valori={DIAFRAMMI} valore={diaframma} formatta={(d) => `f/${d}`}
          onScegli={setDiaframma} onChiudi={() => setAperto(null)} />
      )}
      {aperto === 'focale' && (
        <Selettore titolo="Focale" valori={focali} valore={focale}
          formatta={(f) => `${f} mm`}
          onScegli={setFocale} onChiudi={() => setAperto(null)} />
      )}
      {aperto === 'filtro' && (
        <Selettore titolo="Filtro" valori={FILTRI.map((f) => f.id)} valore={filtro}
          formatta={(id) => {
            const f = filtroDa(id);
            return f.stop > 0 ? `${f.nome} +${f.stop}` : f.nome;
          }}
          onScegli={setFiltro} onChiudi={() => setAperto(null)} />
      )}
    </div>
  );
}
