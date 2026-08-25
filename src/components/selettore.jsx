import { useEffect, useState } from 'react';

const V = (n) => `var(--${n})`;

/**
 * Selettore — finestra che sale dal basso per scegliere un valore.
 *
 * Sostituisce le griglie sempre aperte: quelle riempivano lo schermo di
 * quadrati e costringevano a scorrere. Qui la schermata resta pulita e
 * ogni parametro si legge come una riga di testo.
 *
 * Il prezzo e' un tap in piu' quando si cambia valore. Lo si paga
 * volentieri perche' la scelta si chiude da sola alla selezione, e
 * perche' chi non cambia nulla non lo paga affatto.
 *
 * L'animazione non e' decorazione: dice da dove viene il pannello e
 * dove tornera'. Senza, comparirebbe di scatto e si perderebbe il
 * legame con la riga che l'ha aperto.
 */
export function Selettore({ titolo, valori, valore, onScegli, onChiudi, formatta }) {
  const [entrato, setEntrato] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntrato(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function chiudi() {
    setEntrato(false);
    setTimeout(onChiudi, 180);
  }

  function scegli(v) {
    onScegli(v);
    chiudi();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      {/* Il velo scurisce quello che resta sotto: dice che il pannello
          e' momentaneo e che si torna da dove si e' partiti. */}
      <div onClick={chiudi} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        opacity: entrato ? 1 : 0,
        transition: 'opacity .18s ease',
      }} />

      <div style={{
        position: 'relative',
        background: V('surf-cont-low'),
        borderRadius: `${V('r-xl')} ${V('r-xl')} 0 0`,
        boxShadow: `inset 0 1px 0 ${V('luce-alto')}`,
        padding: '10px 16px calc(20px + env(safe-area-inset-bottom))',
        transform: entrato ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .22s cubic-bezier(.2,.9,.25,1)',
        /* Alto quanto serve: con ventun tempi le chip fanno sei righe,
           e un pannello basso costringeva a scorrere proprio dove si
           voleva vedere tutto insieme. */
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Maniglia: si tira giu' per chiudere, come ci si aspetta da un
            pannello che sale dal basso. */}
        <div onClick={chiudi} style={{ padding: '4px 0 12px', cursor: 'pointer' }}>
          <div style={{
            width: 40, height: 4, borderRadius: 2, margin: '0 auto',
            background: V('surf-cont-highest'),
          }} />
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12, gap: 12,
        }}>
          <span style={{
            fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: V('on-surface-var'), fontWeight: 400, opacity: 0.85,
          }}>{titolo}</span>
          <button onClick={chiudi} aria-label="Chiudi" style={{
            width: 40, height: 40, minHeight: 40, borderRadius: V('r-full'),
            background: V('surf-cont'), color: V('on-surface-var'),
            fontSize: 15, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>&#10005;</button>
        </div>

        {/* Chip a flusso, non griglia rigida: si dispongono da se' e
            vanno a capo quando serve, quindi il testo non esce mai dal
            bordo qualunque sia la sua lunghezza. E' anche il linguaggio
            di Material invece di una tabella di quadrati. */}
        <div style={{ overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
          <div role="radiogroup" aria-label={titolo} style={{
            display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 4,
          }}>
            {valori.map((v) => {
              const on = v === valore;
              const testo = formatta ? formatta(v) : v;
              return (
                <button key={v} type="button" role="radio" aria-checked={on}
                  onClick={() => scegli(v)}
                  style={{
                    minHeight: 46, padding: on ? '0 16px 0 12px' : '0 16px',
                    background: on ? V('primary-tint') : V('surf-cont'),
                    color: on ? V('primary') : V('on-surface'),
                    boxShadow: on ? `inset 0 0 0 1.5px ${V('primary')}` : 'none',
                    borderRadius: V('r-sm'),
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    fontFamily: V('display'), fontSize: 17,
                    fontWeight: on ? 700 : 500, fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}>
                  {/* Il segno di spunta sul selezionato e' la convenzione
                      Material per i filter chip: dice "questo" senza
                      affidarsi al solo colore. */}
                  {on && <span aria-hidden="true" style={{ fontSize: 14 }}>&#10003;</span>}
                  {testo}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Riga di lettura: mostra il parametro e il suo valore corrente.
 *
 * Sostituisce la griglia di quadrati accesi e spenti. Si legge come una
 * frase — "Tempo 1/125" — invece di richiedere di cercare quale cella
 * e' evidenziata.
 */
export function VoceParametro({ etichetta, valore, suffisso, onClick, accento }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', minHeight: 56, borderRadius: V('r-lg'),
      background: V('surf-cont'), color: V('on-surface'),
      boxShadow: `inset 0 1px 0 ${V('luce-alto')}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '0 18px', textAlign: 'left',
    }}>
      {/* L'etichetta arretra — piccola, spaziata, tenue — perche' e'
          il valore il dato che si legge. La gerarchia si fa col peso
          e con la spaziatura, non solo con la dimensione. */}
      <span style={{
        fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: V('on-surface-var'), fontWeight: 400, flexShrink: 0,
        opacity: 0.85,
      }}>{etichetta}</span>

      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
        <span className="display" style={{
          fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          color: accento ? V('primary') : V('on-surface'),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{valore}</span>
        {suffisso && (
          <span style={{ fontSize: 13, color: V('on-surface-var'), flexShrink: 0 }}>{suffisso}</span>
        )}
      </span>
    </button>
  );
}
