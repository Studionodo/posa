/**
 * esporta.js — CSV, testo leggibile, backup JSON.
 *
 * Nessun invio in rete. Solo download di file e copia negli appunti.
 * Nessuna dipendenza da React.
 */

import { formattaTempo, etichettaPushPull } from './model.js';
import { esportaTutto, importaTutto } from './db.js';

// ─── utilita' ───────────────────────────────────────────────

function scarica(contenuto, nomeFile, tipoMime) {
  const blob = new Blob([contenuto], { type: `${tipoMime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFile;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoca differita: alcuni browser mobili leggono il blob dopo il click.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function nomeSicuro(s) {
  return String(s || 'rullino')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'rullino';
}

export async function copiaNegliAppunti(testo) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(testo);
    return true;
  }
  // Ripiego per contesti non sicuri.
  const ta = document.createElement('textarea');
  ta.value = testo;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  return ok;
}

// ─── CSV ────────────────────────────────────────────────────

function cellaCsv(v) {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Separatore punto e virgola: e' quello che Excel in locale italiano
 * si aspetta. Con la virgola apre tutto in una colonna sola.
 * BOM iniziale, altrimenti Excel sbaglia gli accenti.
 */
export function generaCsv(scatti) {
  const intestazione = ['numero', 'tempo', 'diaframma', 'focale', 'nota', 'timestamp'];
  const righe = [...scatti]
    .sort((a, b) => a.numero - b.numero)
    .map((s) => [s.numero, s.tempo, s.diaframma, s.focale, s.nota, s.timestamp].map(cellaCsv).join(';'));
  return '\uFEFF' + [intestazione.join(';'), ...righe].join('\r\n');
}

export function scaricaCsv(rullino, scatti) {
  scarica(generaCsv(scatti), `${nomeSicuro(rullino.nome)}.csv`, 'text/csv');
}

// ─── testo leggibile ────────────────────────────────────────

/**
 * Il formato che si incolla in una mail al laboratorio o si rilegge
 * a distanza di mesi. L'intestazione porta il push/pull in evidenza:
 * e' il dato che serve prima di tutti gli altri.
 */
export function generaTesto(rullino, scatti) {
  const spinta = etichettaPushPull(rullino);
  const righe = [];

  righe.push(rullino.nome || 'Senza nome');
  righe.push('='.repeat(Math.max(8, (rullino.nome || 'Senza nome').length)));
  righe.push('');
  righe.push(`Pellicola:  ${rullino.pellicola || '—'}`);
  righe.push(`ISO scatola: ${rullino.iso_nominale}`);
  righe.push(`EI esposto:  ${rullino.iso_esposizione}${spinta ? `   ►  ${spinta.toUpperCase()}` : ''}`);
  righe.push(`Formato:    ${rullino.formato} · ${rullino.pose_totali} pose`);
  righe.push(`Corpo:      ${rullino.corpo || '—'}`);
  righe.push(`Obiettivo:  ${rullino.obiettivo || '—'}`);
  if (rullino.note) righe.push(`Note:       ${rullino.note}`);
  righe.push('');
  righe.push(`Scatti registrati: ${scatti.length}`);
  righe.push('');

  [...scatti].sort((a, b) => a.numero - b.numero).forEach((s) => {
    const num = String(s.numero).padStart(2, ' ');
    const parti = [formattaTempo(s.tempo), `f/${s.diaframma}`];
    if (s.focale) parti.push(`${s.focale}mm`);
    if (s.ei_override) parti.push(`EI ${s.ei_override}`);
    righe.push(`${num}.  ${parti.join('  ·  ')}${s.nota ? `\n     ${s.nota}` : ''}`);
  });

  if (spinta) {
    righe.push('');
    righe.push(`Da comunicare al laboratorio: sviluppo ${spinta}.`);
  }

  return righe.join('\n');
}

export function scaricaTesto(rullino, scatti) {
  scarica(generaTesto(rullino, scatti), `${nomeSicuro(rullino.nome)}.txt`, 'text/plain');
}

// ─── backup completo ────────────────────────────────────────

export async function scaricaBackup() {
  const dump = await esportaTutto();
  const data = new Date().toISOString().slice(0, 10);
  scarica(JSON.stringify(dump, null, 2), `rullino-backup-${data}.json`, 'application/json');
  return dump;
}

export function leggiFileBackup(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      try { resolve(JSON.parse(fr.result)); }
      catch { reject(new Error('Il file non e\' un backup valido.')); }
    };
    fr.onerror = () => reject(new Error('Impossibile leggere il file.'));
    fr.readAsText(file);
  });
}

export async function ripristinaBackup(file, modo = 'unisci') {
  const dump = await leggiFileBackup(file);
  return importaTutto(dump, modo);
}
