import { useState } from 'react';
import { Label, PulsanteAzione, PulsanteTondo } from '../components/components.jsx';
import { nuovoSviluppo, RIVELATORI, AGITAZIONI, etichettaPushPull } from '../lib/model.js';

const V = (n) => `var(--${n})`;

function Campo({ etichetta, valore, onChange, placeholder, tipo = 'text', suffisso }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Label>{etichetta}</Label>
      <div style={{ position: 'relative' }}>
        <input type={tipo} value={valore} placeholder={placeholder}
          inputMode={tipo === 'number' ? 'decimal' : undefined}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingRight: suffisso ? 44 : 18 }} />
        {suffisso && (
          <span style={{
            position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)',
            color: V('on-surface-var'), fontSize: 15, pointerEvents: 'none',
          }}>{suffisso}</span>
        )}
      </div>
    </div>
  );
}

/** Suggerimenti tappabili: riempiono il campo senza aprire la tastiera. */
function Suggerimenti({ voci, valore, onScegli }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: -8, marginBottom: 16 }}>
      {voci.map((v) => {
        const on = v === valore;
        return (
          <button key={v} onClick={() => onScegli(on ? '' : v)} style={{
            minHeight: 40, padding: '0 14px', borderRadius: V('r-full'),
            background: on ? V('primary-tint') : V('surf-cont'),
            color: on ? V('primary') : V('on-surface-var'),
            boxShadow: on ? `inset 0 0 0 1.5px ${V('primary')}` : 'none',
            fontSize: 13, fontWeight: on ? 600 : 400,
          }}>{v}</button>
        );
      })}
    </div>
  );
}

/**
 * Sviluppo — la meta' mancante del libro mastro.
 *
 * Si registra l'esposizione con precisione e poi lo sviluppo, che pesa
 * altrettanto sul negativo finale, non si registra affatto. Questi sono
 * i dati che permettono di ripetere un risultato riuscito, o di capire
 * cosa e' andato storto in uno sbagliato.
 *
 * Salvare imposta anche lo stato del rullino a 'sviluppato': se hai
 * compilato questa scheda, il rullino e' passato per la tanica.
 */
export default function Sviluppo({ rullino, onSalva, onIndietro }) {
  const [sv, setSv] = useState(() => nuovoSviluppo(rullino.sviluppo || {}));
  const set = (k) => (v) => setSv((p) => ({ ...p, [k]: v }));

  const push = etichettaPushPull(rullino);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 4px', flexShrink: 0 }}>
        <PulsanteTondo onClick={onIndietro} etichetta="Torna al rullino">&#8592;</PulsanteTondo>
        <div style={{ minWidth: 0, flex: 1, paddingLeft: 4 }}>
          <div className="display" style={{ fontSize: 20, fontWeight: 600 }}>Sviluppo</div>
          <div style={{
            fontSize: 13, color: V('on-surface-var'),
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{rullino.nome}</div>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, minHeight: 0 }}>

        {/* Il push/pull e' il primo dato che serve in camera oscura:
            determina il tempo di sviluppo prima di ogni altra cosa. */}
        {push && (
          <div style={{
            marginBottom: 20, padding: '14px 18px', borderRadius: V('r-lg'),
            background: V('primary'), color: V('on-primary'),
            fontSize: 15, fontWeight: 600,
          }}>
            Esposto {push} — lo sviluppo va compensato
          </div>
        )}

        <Campo etichetta="Rivelatore" valore={sv.rivelatore} onChange={set('rivelatore')}
          placeholder="Ilford ID-11" />
        <Suggerimenti voci={RIVELATORI} valore={sv.rivelatore} onScegli={set('rivelatore')} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Campo etichetta="Diluizione" valore={sv.diluizione} onChange={set('diluizione')}
            placeholder="1+1" />
          <Campo etichetta="Temperatura" valore={sv.gradi} onChange={set('gradi')}
            tipo="number" suffisso="&deg;C" />
        </div>

        <Campo etichetta="Tempo" valore={sv.minuti} onChange={set('minuti')}
          tipo="number" placeholder="13" suffisso="min" />

        <Campo etichetta="Agitazione" valore={sv.agitazione} onChange={set('agitazione')}
          placeholder="10s ogni minuto" />
        <Suggerimenti voci={AGITAZIONI} valore={sv.agitazione} onScegli={set('agitazione')} />

        <Campo etichetta="Laboratorio" valore={sv.laboratorio} onChange={set('laboratorio')}
          placeholder="se sviluppato da altri" />

        <Campo etichetta="Note" valore={sv.note} onChange={set('note')}
          placeholder="Cosa rifarei diversamente" />

        <div style={{
          marginTop: 8, color: V('on-surface-var'), fontSize: 13, lineHeight: 1.5,
        }}>
          Salvando, il rullino passa allo stato <strong style={{ color: V('primary') }}>sviluppato</strong> e
          si sposta in archivio. Questi dati compaiono nella scheda stampata.
        </div>
      </div>

      <PulsanteAzione onClick={() => onSalva(sv)}>SALVA</PulsanteAzione>
    </div>
  );
}
