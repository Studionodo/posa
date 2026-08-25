import {
  Chip, StrisciaPellicola, FotogrammaVuoto, PulsanteTondo, Sfumatura,
} from '../components/components.jsx';
import { etichettaPushPull, formattaData, ETICHETTE_FORMATO, riassuntoSviluppo } from '../lib/model.js';

const V = (n) => `var(--${n})`;

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

/**
 * Archivio — i rullini sviluppati.
 *
 * Toccandone uno si apre la stessa schermata Rullino che si apre dalla
 * Home, con lo stesso menu ⋯: stampare un rullino sviluppato non e' un
 * percorso da imparare a parte.
 *
 * La selezione ha le stesse due colonne della Home — passaggio di stato
 * a sinistra, stampa a destra. Cambia solo la direzione: di la' si va
 * avanti a "sviluppato", di qua si torna indietro a "finito".
 */
export default function Archivio({
  rullini, conteggi, selezione, setSelezione,
  onApri, onRiporta, onStampa, onIndietro,
}) {
  const inSelezione = selezione !== null;
  const tuttiScelti = inSelezione
    && selezione.length > 0
    && selezione.length === rullini.length;

  function tocca(r) {
    if (!inSelezione) { onApri(r.id); return; }
    setSelezione((p) => p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]);
  }

  const iconaHeader = {
    width: 44, minHeight: 44, borderRadius: V('r-full'),
    background: V('surf-cont-high'), color: V('primary'), fontSize: 19,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 4px', flexShrink: 0 }}>
        <PulsanteTondo onClick={onIndietro} etichetta="Torna ai rullini">&#8592;</PulsanteTondo>
        <div style={{ flex: 1, paddingLeft: 4, minWidth: 0 }}>
          <div className="display" style={{ fontSize: 22, fontWeight: 600 }}>Archivio</div>
          <div style={{ fontSize: 13, color: V('on-surface-var') }}>
            {rullini.length} {rullini.length === 1 ? 'rullino sviluppato' : 'rullini sviluppati'}
          </div>
        </div>

        {!inSelezione ? (
          rullini.length > 0 && (
            <IconaEtichetta simbolo="&#10003;" testo="SCEGLI"
              onClick={() => setSelezione([])} />
          )
        ) : (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setSelezione(tuttiScelti ? [] : rullini.map((r) => r.id))}
              style={{
                minHeight: 44, padding: '0 16px', borderRadius: V('r-full'),
                background: tuttiScelti ? V('primary-tint') : V('surf-cont-high'),
                color: V('primary'),
                boxShadow: tuttiScelti ? `inset 0 0 0 1.5px ${V('primary')}` : 'none',
                fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap',
              }}>
              {selezione.length ? `${selezione.length} di ${rullini.length}` : 'Tutti'}
            </button>
            <button onClick={() => setSelezione(null)} aria-label="Annulla selezione"
              style={{ ...iconaHeader, background: V('surf-cont'), color: V('on-surface-var') }}>
              &#10005;
            </button>
          </div>
        )}
      </header>

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Sfumatura verso="basso" altezza={24} />
        <div style={{ height: '100%', overflowY: 'auto', padding: '12px 16px 0' }}>

          {!rullini.length && (
            <FotogrammaVuoto>
              Archivio vuoto.<br />I rullini sviluppati finiscono qui.
            </FotogrammaVuoto>
          )}

          {rullini.map((r) => {
            const n = conteggi[r.id] || 0;
            const push = etichettaPushPull(r);
            const sv = riassuntoSviluppo(r.sviluppo);
            const scelto = inSelezione && selezione.includes(r.id);

            return (
              <button key={r.id} onClick={() => tocca(r)} style={{
                display: 'block', width: '100%', textAlign: 'left', marginBottom: 8,
                padding: 16, borderRadius: V('r-xl'),
                background: scelto ? V('surf-cont-highest') : V('surf-cont-low'),
                color: scelto ? V('on-surface') : V('on-surface-var'),
                outline: scelto ? `2px solid ${V('primary')}` : 'none',
                outlineOffset: -2,
                boxShadow: `inset 0 1px 0 ${V('luce-alto')}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <span className="display" style={{
                    fontSize: 19, fontWeight: 600, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{r.nome}</span>
                  <span className="display" style={{
                    fontSize: 21, fontWeight: 700, flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums', color: V('on-surface-var'),
                  }}>{n}/{r.pose_totali}</span>
                </div>

                <div style={{ fontSize: 14, marginTop: 4 }}>
                  {[
                    r.pellicola,
                    ETICHETTE_FORMATO[r.formato] || r.formato,
                    r.data_fine ? formattaData(r.data_fine) : null,
                  ].filter(Boolean).join(' \u00b7 ')}
                </div>

                {/* Il dato di sviluppo e' la ragione per cui si torna qui
                    mesi dopo: ripetere un risultato riuscito. */}
                {sv && (
                  <div style={{
                    fontSize: 13, marginTop: 6, color: V('primary'),
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{sv}</div>
                )}

                {push && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                    <Chip>{push}</Chip>
                  </div>
                )}

                <StrisciaPellicola totali={r.pose_totali} fatti={n} spento />
              </button>
            );
          })}
          <div style={{ height: 8 }} />
        </div>
      </div>

      {inSelezione && (
        <div style={{
          flexShrink: 0, position: 'relative',
          padding: '8px 16px calc(16px + env(safe-area-inset-bottom))',
        }}>
          <Sfumatura />
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={!selezione.length}
              onClick={() => { onRiporta(selezione); setSelezione(null); }}
              style={{
                flex: 1, minHeight: 62, borderRadius: V('r-full'),
                background: selezione.length ? V('surf-cont-high') : V('surf-cont'),
                color: selezione.length ? V('on-surface') : V('on-surface-var'),
                fontFamily: V('display'), fontSize: 15, fontWeight: 700, letterSpacing: '0.05em',
              }}>RIPORTA IN LISTA</button>

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
        </div>
      )}
    </div>
  );
}
