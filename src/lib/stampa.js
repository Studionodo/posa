/**
 * stampa.js — genera la scheda stampabile e lancia il dialogo.
 *
 * Nessuna libreria: il PDF lo produce il browser. Chrome Android →
 * menu → Stampa → Salva come PDF. Il motore di impaginazione del
 * browser gestisce testo e interruzioni meglio di quanto si possa fare
 * a mano con coordinate assolute, e costa zero KB in cache.
 *
 * Il contenuto viene scritto in #scheda-stampa, che e' display:none in
 * video e visibile solo in @media print (vedi stampa.css).
 */

import { formattaTempo, etichettaPushPull, ETICHETTE_STATO, ETICHETTE_FORMATO, filtroDa, sviluppoCompilato } from './model.js';

const ID = 'scheda-stampa';

// ─── utilita' ───────────────────────────────────────────────

/** Nessun dato entra nel DOM senza passare di qui. */
function esc(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function dataEstesa(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

function contenitore() {
  let el = document.getElementById(ID);
  if (!el) {
    el = document.createElement('div');
    el.id = ID;
    document.body.appendChild(el);
  }
  return el;
}

// ─── blocchi ────────────────────────────────────────────────

function dato(etichetta, valore) {
  if (!valore && valore !== 0) return '';
  return `<div class="sk-dato">
    <span class="sk-etichetta">${esc(etichetta)}</span>
    <span class="sk-valore">${esc(valore)}</span>
  </div>`;
}

function testata(r, n) {
  const spinta = etichettaPushPull(r);
  const inizio = dataEstesa(r.data_inizio);
  const fine = dataEstesa(r.data_fine);
  const periodo = inizio && fine && inizio !== fine ? `${inizio} — ${fine}` : inizio;

  return `<div class="sk-testata">
    <p class="sk-titolo">${esc(r.nome || 'Senza nome')}</p>
    ${r.archivio ? `<p class="sk-s" style="letter-spacing:.1em">N. ${esc(r.archivio)}</p>` : ''}
    <p class="sk-sottotitolo">${esc(r.pellicola || 'Pellicola non indicata')}${periodo ? ` · ${esc(periodo)}` : ''}</p>
  </div>

  <div class="sk-dati">
    ${dato('ISO scatola', r.iso_nominale)}
    ${dato('EI esposto', r.iso_esposizione)}
    ${dato('Formato', `${ETICHETTE_FORMATO[r.formato] || r.formato} · ${r.pose_totali} pose`)}
    ${dato('Scatti registrati', n)}
    ${dato('Corpo', r.corpo)}
    ${dato('Obiettivo', r.obiettivo)}
    ${dato('Stato', ETICHETTE_STATO[r.stato] || r.stato)}
    ${spinta ? `<div class="sk-dato">
      <span class="sk-etichetta">Sviluppo</span>
      <span class="sk-spinta">${esc(spinta)}</span>
    </div>` : ''}
  </div>
  ${r.note ? `<p style="margin:0 0 6mm">${esc(r.note)}</p>` : ''}`;
}

function ora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Tutti gli scatti, nessuna riga omessa. Con un 36 pose la tabella
 * occupa due pagine: ci pensa il motore del browser, e il CSS ripete
 * l'intestazione delle colonne e impedisce che una riga si spezzi.
 */
function tabella(scatti) {
  if (!scatti.length) {
    return '<p class="sk-vuoto">Nessuno scatto registrato.</p>';
  }

  const righe = [...scatti]
    .sort((a, b) => a.numero - b.numero)
    .map((s) => `<tr>
      <td class="sk-num">${esc(s.numero)}</td>
      <td class="sk-ora">${esc(ora(s.timestamp))}</td>
      <td class="sk-tempo">${esc(formattaTempo(s.tempo))}</td>
      <td class="sk-diafr">f/${esc(s.diaframma)}</td>
      <td class="sk-focale">${s.focale ? `${esc(s.focale)} mm` : ''}</td>
      <td class="sk-nota">${[
        esc(s.nota),
        s.filtro ? `filtro ${esc(filtroDa(s.filtro).nome)}` : '',
        s.ei_override ? `EI ${esc(s.ei_override)}` : '',
      ].filter(Boolean).join(' · ')}</td>
    </tr>`)
    .join('');

  return `<table class="sk-tabella">
    <thead><tr>
      <th class="sk-num">N.</th>
      <th class="sk-ora">Ora</th>
      <th class="sk-tempo">Tempo</th>
      <th class="sk-diafr">Diaframma</th>
      <th class="sk-focale">Focale</th>
      <th class="sk-nota">Nota</th>
    </tr></thead>
    <tbody>${righe}</tbody>
  </table>`;
}

/**
 * Se lo sviluppo e' stato registrato lo stampa; altrimenti lascia le
 * righe vuote per annotarlo a penna in camera oscura.
 */
function piede(r) {
  const sv = r && r.sviluppo;

  if (!sviluppoCompilato(sv)) {
    return `<div class="sk-piede">
      <span class="sk-etichetta">Sviluppo</span>
      <div class="sk-righe-vuote"></div>
      <div class="sk-righe-vuote"></div>
    </div>`;
  }

  const voci = [
    ['Rivelatore', [sv.rivelatore, sv.diluizione].filter(Boolean).join(' ')],
    ['Tempo', sv.minuti ? `${sv.minuti} min` : ''],
    ['Temperatura', sv.gradi ? `${sv.gradi} \u00b0C` : ''],
    ['Agitazione', sv.agitazione],
    ['Laboratorio', sv.laboratorio],
  ].filter(([, v]) => v);

  return `<div class="sk-piede">
    <span class="sk-etichetta">Sviluppo</span>
    <div class="sk-dati" style="margin-top:3mm">
      ${voci.map(([e, v]) => `<div class="sk-dato">
        <span class="sk-etichetta">${esc(e)}</span><span>${esc(v)}</span>
      </div>`).join('')}
    </div>
    ${sv.note ? `<p style="margin:2mm 0 0">${esc(sv.note)}</p>` : ''}
  </div>`;
}

function scheda(r, scatti) {
  return `<section class="sk-rullino">
    ${testata(r, scatti.length)}
    ${tabella(scatti)}
    ${piede(r)}
  </section>`;
}

function indice(coppie) {
  const voci = coppie.map(({ rullino, scatti }) =>
    `<li>${esc(rullino.nome || 'Senza nome')} — ${esc(rullino.pellicola || '—')} · ${scatti.length}/${rullino.pose_totali}</li>`
  ).join('');

  return `<section class="sk-indice">
    <div class="sk-testata">
      <p class="sk-titolo">Posa.</p>
      <p class="sk-sottotitolo">${coppie.length} rullini · ${dataEstesa(new Date().toISOString())}</p>
    </div>
    <ol>${voci}</ol>
  </section>`;
}

// ─── interfaccia pubblica ───────────────────────────────────

/**
 * Prepara la scheda e apre il dialogo di stampa.
 * `coppie` = [{ rullino, scatti }]. Con piu' di un elemento antepone
 * un indice; ogni rullino va su una pagina propria.
 */
export function stampaSchede(coppie) {
  if (!coppie || !coppie.length) return false;

  const el = contenitore();
  el.innerHTML =
    (coppie.length > 1 ? indice(coppie) : '') +
    coppie.map(({ rullino, scatti }) => scheda(rullino, scatti || [])).join('');

  // Il titolo del documento diventa il nome proposto per il PDF.
  const titoloOriginale = document.title;
  document.title = coppie.length === 1
    ? (coppie[0].rullino.nome || 'Posa')
    : `Posa — ${coppie.length} rullini`;

  const ripristina = () => {
    document.title = titoloOriginale;
    window.removeEventListener('afterprint', ripristina);
  };
  window.addEventListener('afterprint', ripristina);

  // Un frame di respiro: il layout deve essere calcolato prima del dialogo.
  requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  return true;
}

export function stampaRullino(rullino, scatti) {
  return stampaSchede([{ rullino, scatti }]);
}

export function svuotaScheda() {
  const el = document.getElementById(ID);
  if (el) el.innerHTML = '';
}
