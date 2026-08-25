import { useState } from 'react';
import { Label, PulsanteAzione, PulsanteTondo } from '../components/components.jsx';
import {
  FORMATI, POSE_PER_FORMATO, ETICHETTE_FORMATO, nuovoRullino,
  etichettaPushPull, precompilaDaUltimo, prossimoArchivio,
} from '../lib/model.js';

const V = (n) => `var(--${n})`;

function Campo({ etichetta, valore, onChange, placeholder, tipo = 'text' }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Label>{etichetta}</Label>
      <input type={tipo} value={valore} placeholder={placeholder}
        inputMode={tipo === 'number' ? 'numeric' : undefined}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Segmento({ opzioni, valore, onChange, attivoSe, etichette }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${opzioni.length}, 1fr)`,
      gap: 4, marginBottom: 16,
    }}>
      {opzioni.map((x) => {
        const on = attivoSe ? attivoSe(x) : String(x) === String(valore);
        return (
          <button key={x} onClick={() => { onChange(x); }} style={{
            minHeight: 56, background: on ? V('primary') : V('surf-cont'),
            color: on ? V('on-primary') : V('on-surface'),
            borderRadius: on ? V('r-xl') : V('r-md'),
            transform: on ? 'scale(1.04)' : 'scale(1)',
            fontFamily: V('display'), fontSize: 20, fontWeight: on ? 700 : 500,
          }}>{etichette ? etichette[x] : x}</button>
        );
      })}
    </div>
  );
}

/**
 * Nuovo rullino.
 *
 * Corpo e obiettivo sono testo libero: nessun selettore di focali. La
 * griglia sul campo si deriva silenziosamente dall'obiettivo — il testo
 * libero E' l'interfaccia di configurazione. Scrivendo "28 + 50 + 85" si
 * ottengono le tre fisse senza alcuna schermata in piu'.
 */
/**
 * Serve sia a creare sia a modificare: la forma e' identica, cambia
 * solo cosa succede al salvataggio. Una schermata sola da mantenere.
 *
 * In modifica non si tocca l'identificativo d'archivio: quel numero e'
 * gia' sulla busta del negativo.
 */
export default function NuovoRullino({ ultimo, tuttiRullini, rullino, onCrea, onIndietro }) {
  const inModifica = !!rullino;
  const base = precompilaDaUltimo(ultimo ? [ultimo] : []);

  const [f, setF] = useState({
    nome: '',
    pellicola: base.pellicola || '',
    iso_nominale: String(base.iso_nominale || 400),
    iso_esposizione: String(base.iso_esposizione || 400),
    formato: base.formato || '35mm',
    pose_totali: String(base.pose_totali || 36),
    corpo: base.corpo || '',
    obiettivo: base.obiettivo || '',
  });

  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  /* I preset coprono i formati commerciali. Chi carica da bulk esce con
     conteggi arbitrari e senza valore libero dovrebbe mentire scegliendo
     36. Il campo appare solo se richiesto. */
  const fuoriPreset = !POSE_PER_FORMATO[f.formato].map(String).includes(f.pose_totali);
  const [altroAperto, setAltroAperto] = useState(false);
  const mostraAltro = altroAperto || fuoriPreset;

  const spinta = etichettaPushPull({
    iso_nominale: Number(f.iso_nominale),
    iso_esposizione: Number(f.iso_esposizione),
  });

  function crea() {
    onCrea(nuovoRullino({
      nome: f.nome.trim() || 'Senza nome',
      pellicola: f.pellicola.trim(),
      iso_nominale: Math.max(1, Number(f.iso_nominale) || 400),
      iso_esposizione: Math.max(1, Number(f.iso_esposizione) || Number(f.iso_nominale) || 400),
      formato: f.formato,
      pose_totali: Math.max(1, Number(f.pose_totali) || 36),
      corpo: f.corpo.trim(),
      obiettivo: f.obiettivo.trim(),
      focali: [],
      // In modifica l'archivio resta: quel numero e' gia' sulla busta.
      archivio: inModifica ? rullino.archivio : prossimoArchivio(tuttiRullini || []),
      // In modifica si conservano identita', stato e storia.
      ...(inModifica ? {
        id: rullino.id,
        stato: rullino.stato,
        data_inizio: rullino.data_inizio,
        data_fine: rullino.data_fine,
        sviluppo: rullino.sviluppo,
      } : {}),
    }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', flexShrink: 0 }}>
        <PulsanteTondo onClick={onIndietro} etichetta="Annulla">←</PulsanteTondo>
        <div className="display" style={{ fontSize: 22, fontWeight: 600 }}>
          {inModifica ? 'Modifica rullino' : 'Nuovo rullino'}
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, minHeight: 0 }}>

        <Campo etichetta="Nome" valore={f.nome} onChange={set('nome')} placeholder="Madonna dell'Arco" />
        <Campo etichetta="Pellicola" valore={f.pellicola} onChange={set('pellicola')} placeholder="Ilford HP5 Plus" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Campo etichetta="ISO scatola" valore={f.iso_nominale} onChange={set('iso_nominale')} tipo="number" />
          <Campo etichetta="EI esposto" valore={f.iso_esposizione} onChange={set('iso_esposizione')} tipo="number" />
        </div>

        {spinta && (
          <div style={{
            marginTop: -4, marginBottom: 16, padding: '14px 18px', borderRadius: V('r-lg'),
            background: V('primary'), color: V('on-primary'), fontSize: 15, fontWeight: 600,
          }}>{spinta} — da comunicare al laboratorio</div>
        )}

        <Label>Formato</Label>
        <Segmento opzioni={FORMATI} etichette={ETICHETTE_FORMATO} valore={f.formato}
          onChange={(x) => {
            setAltroAperto(false);
            setF((p) => ({ ...p, formato: x, pose_totali: String(POSE_PER_FORMATO[x][0]) }));
          }} />

        <Label>Pose</Label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${POSE_PER_FORMATO[f.formato].length + 1}, 1fr)`,
          gap: 4, marginBottom: mostraAltro ? 8 : 16,
        }}>
          {POSE_PER_FORMATO[f.formato].map((n) => {
            const on = String(n) === f.pose_totali && !fuoriPreset;
            return (
              <button key={n} onClick={() => { setAltroAperto(false); set('pose_totali')(String(n)); }}
                style={{
                  minHeight: 56, background: on ? V('primary') : V('surf-cont'),
                  color: on ? V('on-primary') : V('on-surface'),
                  borderRadius: on ? V('r-xl') : V('r-md'),
                  transform: on ? 'scale(1.04)' : 'scale(1)',
                  fontFamily: V('display'), fontSize: 20, fontWeight: on ? 700 : 500,
                }}>{n}</button>
            );
          })}
          <button onClick={() => setAltroAperto(true)} style={{
            minHeight: 56,
            background: fuoriPreset ? V('primary') : V('surf-cont'),
            color: fuoriPreset ? V('on-primary') : V('on-surface-var'),
            borderRadius: fuoriPreset ? V('r-xl') : V('r-md'),
            transform: fuoriPreset ? 'scale(1.04)' : 'scale(1)',
            fontFamily: V('display'), fontSize: 20, fontWeight: fuoriPreset ? 700 : 500,
          }}>{fuoriPreset ? f.pose_totali : 'altro'}</button>
        </div>

        {mostraAltro && (
          <div style={{ marginBottom: 16 }}>
            <input type="number" inputMode="numeric" min="1" max="200" autoFocus
              value={f.pose_totali} onChange={(e) => set('pose_totali')(e.target.value)}
              placeholder="Pose caricate"
              style={{ fontFamily: V('display'), fontSize: 20 }} />
            <div style={{ color: V('on-surface-var'), fontSize: 13, marginTop: 8 }}>
              Per pellicola caricata da bulk.
            </div>
          </div>
        )}

        <Campo etichetta="Corpo" valore={f.corpo} onChange={set('corpo')} placeholder="Nikon FM2" />
        <Campo etichetta="Obiettivo" valore={f.obiettivo} onChange={set('obiettivo')}
          placeholder="35mm f/2 · 24-70 · 28 + 50 + 85" />
      </div>

      <PulsanteAzione onClick={crea}>
        {inModifica ? 'SALVA' : 'CARICA'}
      </PulsanteAzione>
    </div>
  );
}
