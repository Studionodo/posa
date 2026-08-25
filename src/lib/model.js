/**
 * model.js — modello dati e costanti.
 *
 * Nessuna dipendenza da React, nessuna da IndexedDB.
 * Naming in convenzione ecosistema Istante Labs: snake_case, id uuid,
 * timestamp ISO 8601, campo user_id presente e sempre null finche'
 * l'app resta single-user. Se un giorno migra su Supabase, le righe
 * entrano nello schema senza rimappature.
 */

export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const ora = () => new Date().toISOString();

// ─── costanti fotografiche ──────────────────────────────────

/**
 * Scala completa dei tempi di posa, a stop pieni.
 *
 * Da 1/8000 — il piu' veloce sulle reflex professionali a pellicola,
 * Nikon F5 e F100, Canon EOS-1V — fino a 60 secondi, poi posa B.
 *
 * Ogni valore raddoppia il precedente: e' la stessa progressione incisa
 * sulla ghiera dell'otturatore, quindi si ritrova a occhio senza dover
 * cercare.
 *
 * "B" registra che hai usato la posa B, non per quanto: se la durata
 * conta, va nella nota — o la calcola la correzione di reciprocita'.
 */
export const TEMPI = [
  '8000', '4000', '2000', '1000', '500', '250',
  '125', '60', '30', '15', '8', '4',
  '2', '1', '2"', '4"', '8"', '15"',
  '30"', '60"', 'B',
];

/**
 * Diaframmi: la scala a stop pieni piu' le aperture massime reali.
 *
 * f/1.8, f/3.5 e f/4.5 non stanno sulla progressione dei raddoppi, ma
 * sono le aperture massime di obiettivi diffusissimi — il 50/1.8, gli
 * zoom f/3.5-5.6. Senza, chi scatta a tutta apertura non puo'
 * registrare cio' che ha realmente fatto.
 *
 * f/45 e f/64 servono al grande formato.
 */
export const DIAFRAMMI = [
  '1', '1.2', '1.4', '1.8', '2', '2.8',
  '3.5', '4', '4.5', '5.6', '6.3', '8',
  '11', '16', '22', '32', '45', '64',
];

/**
 * Focali realmente esistenti sul mercato, dal fisheye al super-tele.
 *
 * Comprende sia le focali del 35mm (21, 24, 28, 35, 50, 85, 105, 135,
 * 180, 200, 300) sia quelle tipiche del medio formato (40, 50, 60, 65,
 * 75, 80, 110, 120, 150, 250, 350), perche' l'app copre entrambi.
 *
 * Serve a generare l'elenco per uno zoom: da questa scala si prendono i
 * valori compresi fra minimo e massimo dichiarati.
 */
export const SCALA_FOCALI = [
  8, 10, 12, 14, 15, 16, 17, 18, 20, 21, 24, 25, 28, 30, 35,
  40, 43, 45, 50, 55, 58, 60, 65, 70, 75, 80, 85, 90,
  100, 105, 110, 120, 127, 135, 150, 180, 200, 250,
  300, 350, 400, 500, 600, 800, 1000,
];

export const FOCALI_DEFAULT = ['24', '28', '35', '50', '85', '135'];

/**
 * Riconosce un intervallo in un testo libero: "24-70", "70–200 f/2.8",
 * "AF-S 18-55mm". Restituisce null se l'obiettivo e' una fissa.
 */
export function riconosciZoom(testoObiettivo) {
  if (!testoObiettivo) return null;
  const m = String(testoObiettivo).match(/(\d{1,3})\s*[-–—]\s*(\d{1,3})/);
  if (!m) return null;
  const min = Number(m[1]);
  const max = Number(m[2]);
  if (!min || !max || max <= min) return null;
  return { min, max };
}

/** Tacche comprese nell'intervallo, estremi sempre inclusi. */
export function generaFocali(min, max) {
  const dentro = SCALA_FOCALI.filter((f) => f > min && f < max);
  return [min, ...dentro, max].map(String);
}

/**
 * Riconosce una o piu' ottiche fisse in un testo libero.
 * "50mm f/1.4" => ["50"] · "Nikkor 28 + 50 + 85" => ["28","50","85"]
 *
 * I diaframmi vanno rimossi PRIMA della ricerca, altrimenti "f/2" viene
 * letto come una focale da 2mm. Stessa cosa per la notazione "1:2.8".
 */
export function riconosciFisse(testoObiettivo) {
  if (!testoObiettivo) return [];
  const pulito = String(testoObiettivo)
    .replace(/f\s*\/\s*[\d.]+/gi, ' ')
    .replace(/1\s*:\s*[\d.]+/g, ' ');
  const trovati = pulito.match(/\d{1,3}(?=\s*mm|\b)/g) || [];
  const validi = trovati
    .map(Number)
    .filter((n) => n >= 6 && n <= 1200);
  return [...new Set(validi)].sort((a, b) => a - b).map(String);
}

/**
 * Griglia focali per un rullino. Il campo focali ha sempre l'ultima
 * parola; se e' vuoto si deriva dall'obiettivo — zoom o fisse — e solo
 * in ultima istanza si usa il set predefinito.
 */
export function focaliPerRullino(rullino) {
  if (rullino && Array.isArray(rullino.focali) && rullino.focali.length) {
    return rullino.focali;
  }
  const obiettivo = rullino && rullino.obiettivo;
  const zoom = riconosciZoom(obiettivo);
  if (zoom) return generaFocali(zoom.min, zoom.max);
  const fisse = riconosciFisse(obiettivo);
  if (fisse.length) return fisse;
  return FOCALI_DEFAULT;
}

export const FORMATI = ['35mm', 'mezzo', '120'];

export const ETICHETTE_FORMATO = { '35mm': '35mm', 'mezzo': '½', '120': '120' };

/** 120: 16 (6x4.5), 12 (6x6), 10 (6x7), 8 (6x9). 35mm: 36, 24, 20, 12. */
export const POSE_PER_FORMATO = {
  '35mm': [36, 30, 24, 20, 12],
  // Mezzo formato: Olympus Pen, Ektar H35 e simili raddoppiano le pose.
  'mezzo': [72, 60, 48, 40, 24],
  '120': [16, 12, 10, 8],
};

export const STATI = ['in_corso', 'finito', 'sviluppato'];

/**
 * Gli stati che si scelgono a mano. "Sviluppato" non e' fra questi: ci
 * si arriva registrando lo sviluppo, che e' quello che succede davvero
 * — un rullino diventa sviluppato quando lo sviluppi, non quando premi
 * un bottone. Averlo anche come pulsante creava due strade allo stesso
 * risultato, una con i dati e una senza, indistinguibili a vedersi.
 */
export const STATI_MANUALI = ['in_corso', 'finito'];

export const ETICHETTE_STATO = {
  in_corso: 'In corso',
  finito: 'Finito',
  sviluppato: 'Sviluppato',
};

// ─── fabbriche ──────────────────────────────────────────────

// ─── RECORD DI SVILUPPO ─────────────────────────────────────

/**
 * La meta' mancante del libro mastro: si registra l'esposizione con
 * precisione e poi lo sviluppo, che pesa altrettanto sul negativo
 * finale, non si registra affatto. Sono i dati che permettono di
 * ripetere un risultato riuscito.
 */
export function nuovoSviluppo(campi = {}) {
  return {
    rivelatore: '',
    diluizione: '',
    minuti: '',
    gradi: '20',
    agitazione: '',
    laboratorio: '',
    note: '',
    ...campi,
  };
}

/** Rivelatori d'uso comune, per evitare di scriverli a mano ogni volta. */
export const RIVELATORI = [
  'D-76', 'ID-11', 'HC-110', 'Rodinal', 'XTOL',
  'DD-X', 'Microphen', 'Perceptol', 'Caffenol', 'C-41',
];

/** Agitazioni tipiche. */
export const AGITAZIONI = [
  'continua', '10s ogni minuto', '30s poi 10s/min', '5s ogni 30s', 'stand',
];

export function sviluppoCompilato(sv) {
  if (!sv) return false;
  return !!(sv.rivelatore || sv.minuti || sv.laboratorio);
}

/** Riga sintetica per la scheda stampata. */
export function riassuntoSviluppo(sv) {
  if (!sviluppoCompilato(sv)) return null;
  const parti = [];
  if (sv.rivelatore) parti.push(sv.rivelatore + (sv.diluizione ? ` ${sv.diluizione}` : ''));
  if (sv.minuti) parti.push(`${sv.minuti}′`);
  if (sv.gradi) parti.push(`${sv.gradi}°C`);
  if (sv.agitazione) parti.push(sv.agitazione);
  return parti.join(' · ');
}

export function nuovoRullino(campi = {}) {
  const iso = Number(campi.iso_nominale) || 400;
  const formato = campi.formato || '35mm';
  return {
    id: uuid(),
    user_id: null,
    nome: '',
    pellicola: '',
    iso_nominale: iso,
    // Indice di esposizione realmente usato. Uguale al nominale finche'
    // non si tira o non si trattiene: e' questo il dato che serve in
    // camera oscura, non quello scritto sulla scatola.
    iso_esposizione: iso,
    formato,
    pose_totali: POSE_PER_FORMATO[formato][0],
    corpo: '',
    obiettivo: '',
    // Identificativo progressivo per anno: va sulla busta del negativo
    archivio: '',
    // Griglia focali di questo rullino. Vuota = derivata dall'obiettivo
    // al volo da focaliPerRullino(). Compilata = scelta esplicita.
    focali: [],
    data_inizio: ora(),
    data_fine: null,
    stato: 'in_corso',
    note: '',
    // Predisposto, non compilato dall'app in questa versione. Esiste
    // perche' un libro mastro senza il record di sviluppo e' meta' libro,
    // e aggiungere un campo dopo costa piu' che lasciarlo null adesso.
    sviluppo: null,
    created_at: ora(),
    updated_at: ora(),
    ...campi,
  };
}

export function nuovoScatto(rullinoId, numero, campi = {}) {
  return {
    id: uuid(),
    user_id: null,
    rullino_id: rullinoId,
    numero,
    tempo: '125',
    diaframma: '8',
    focale: '',
    // Solo se questo scatto e' stato esposto a un EI diverso dal resto
    // del rullino. Quasi sempre null.
    ei_override: null,
    // Filtro montato: il fattore in stop e' gia' compensato nel tempo
    // scelto, ma il dato serve a rileggere il negativo.
    filtro: '',
    nota: '',
    timestamp: ora(),
    created_at: ora(),
    updated_at: ora(),
    ...campi,
  };
}

// ─── derivati ───────────────────────────────────────────────

/**
 * Stop di push (positivo) o pull (negativo).
 * Tri-X 400 esposta a 1600 => +2. E' il numero che determina lo sviluppo.
 */
export function stopPushPull(rullino) {
  if (!rullino || !rullino.iso_nominale || !rullino.iso_esposizione) return 0;
  return Math.log2(rullino.iso_esposizione / rullino.iso_nominale);
}

export function etichettaPushPull(rullino) {
  const s = stopPushPull(rullino);
  if (Math.abs(s) < 0.05) return null;
  const arrotondato = Math.round(s * 10) / 10;
  const segno = arrotondato > 0 ? '+' : '';
  const verso = arrotondato > 0 ? 'push' : 'pull';
  return `${segno}${arrotondato} ${verso}`;
}

/**
 * Contatore. Le pellicole regalano quasi sempre una posa in piu' e a
 * volte due: si consente di superare il totale, non si blocca.
 */
export function contatore(scatti, rullino) {
  const fatti = scatti.length;
  const totali = rullino ? rullino.pose_totali : 0;
  return {
    fatti,
    totali,
    oltre: fatti > totali,
    testo: `${fatti}/${totali}`,
  };
}

export function prossimoNumero(scatti) {
  if (!scatti.length) return 1;
  return Math.max(...scatti.map((s) => s.numero)) + 1;
}

/** Valori dell'ultimo scatto, per precompilare il successivo. */
export function ultimiValori(scatti) {
  if (!scatti.length) return { tempo: '125', diaframma: '8', focale: '', filtro: '' };
  const ultimo = scatti.reduce((a, b) => (b.numero > a.numero ? b : a));
  return {
    tempo: ultimo.tempo,
    diaframma: ultimo.diaframma,
    focale: ultimo.focale,
    filtro: ultimo.filtro || '',
  };
}

/** Campi dell'ultimo rullino, per precompilare il nuovo. */
export function precompilaDaUltimo(rullini) {
  if (!rullini.length) return {};
  const ultimo = rullini[0];
  return {
    pellicola: ultimo.pellicola,
    iso_nominale: ultimo.iso_nominale,
    iso_esposizione: ultimo.iso_esposizione,
    formato: ultimo.formato,
    pose_totali: ultimo.pose_totali,
    corpo: ultimo.corpo,
    obiettivo: ultimo.obiettivo,
    focali: ultimo.focali,
  };
}

// ─── formattazione ──────────────────────────────────────────

export function formattaTempo(t) {
  if (t === 'B') return 'posa B';
  if (t.endsWith('"')) return `${t.slice(0, -1)} s`;
  return `1/${t}`;
}

export function formattaData(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export function formattaOra(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

// ─── DIFETTO DI RECIPROCITA' ────────────────────────────────

/**
 * Sopra il secondo di esposizione la pellicola perde sensibilita' in
 * modo non lineare: la legge di reciprocita' smette di valere. Un tempo
 * misurato di 4 secondi puo' richiederne 8 reali, 30 puo' diventarne 80.
 *
 * La correzione segue t_reale = t_misurato ^ p, dove p dipende
 * dall'emulsione. Sono i valori pubblicati dai produttori nelle schede
 * tecniche; per le emulsioni non riconosciute si usa un valore
 * conservativo tipico delle bianco e nero tradizionali.
 *
 * ATTENZIONE: sono approssimazioni della curva reale, buone fino a
 * qualche minuto. Per esposizioni molto lunghe conviene comunque
 * bracketare.
 */
const EMULSIONI = [
  // Fuji Acros: praticamente immune fino a 120 secondi. E' il motivo
  // per cui e' la pellicola delle lunghe esposizioni.
  { cerca: ['acros'], p: 1.00, soglia: 120, nota: 'Nessuna correzione fino a 2 minuti' },

  // Kodak T-grain: molto migliori delle tradizionali
  { cerca: ['t-max', 'tmax', 't max'], p: 1.14, soglia: 1 },
  { cerca: ['delta'], p: 1.16, soglia: 1 },

  // Bianco e nero tradizionali
  { cerca: ['hp5', 'hp 5'], p: 1.31, soglia: 1 },
  { cerca: ['fp4', 'fp 4'], p: 1.26, soglia: 1 },
  { cerca: ['tri-x', 'trix', 'tri x'], p: 1.28, soglia: 1 },
  { cerca: ['pan f'], p: 1.33, soglia: 1 },
  { cerca: ['kentmere'], p: 1.30, soglia: 1 },

  // Negative a colori: correzioni contenute
  { cerca: ['portra'], p: 1.10, soglia: 1 },
  { cerca: ['ektar'], p: 1.12, soglia: 1 },
  { cerca: ['gold', 'colorplus', 'ultramax'], p: 1.15, soglia: 1 },

  // Diapositive: correzioni forti, e sopra il minuto vira il colore
  { cerca: ['velvia'], p: 1.30, soglia: 1, nota: 'Sopra 60s vira: serve filtro correttivo' },
  { cerca: ['provia'], p: 1.10, soglia: 1, nota: 'Buona fino a 128s' },
  { cerca: ['ektachrome'], p: 1.20, soglia: 1 },
];

/** Valore prudente per emulsioni non riconosciute (b&n tradizionale). */
const EMULSIONE_IGNOTA = { p: 1.28, soglia: 1, ignota: true };

/** Riconosce l'emulsione dal nome scritto a mano sul rullino. */
export function riconosciEmulsione(pellicola) {
  if (!pellicola) return EMULSIONE_IGNOTA;
  const t = String(pellicola).toLowerCase();
  for (const e of EMULSIONI) {
    if (e.cerca.some((k) => t.includes(k))) return e;
  }
  return EMULSIONE_IGNOTA;
}

/** Secondi corrispondenti a un valore della griglia tempi. */
export function tempoInSecondi(tempo) {
  if (!tempo || tempo === 'B') return null;
  if (tempo.endsWith('"')) return Number(tempo.slice(0, -1));
  const n = Number(tempo);
  return n ? 1 / n : null;
}

function formattaSecondi(s) {
  if (s < 10) return `${s.toFixed(1).replace(/\.0$/, '')}"`;
  if (s < 60) return `${Math.round(s)}"`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return r ? `${m}′ ${r}″` : `${m}′`;
}

/**
 * Correzione per il tempo selezionato su questo rullino.
 * Restituisce null se non serve — sotto la soglia dell'emulsione.
 */
export function correzioneReciprocita(tempo, pellicola) {
  const sec = tempoInSecondi(tempo);
  if (!sec || sec < 1) return null;

  const e = riconosciEmulsione(pellicola);
  if (sec < e.soglia) return null;
  if (e.p === 1.00) return null;

  const corretto = Math.pow(sec, e.p);
  const stop = Math.log2(corretto / sec);
  if (stop < 0.15) return null;   // sotto un sesto di stop non vale la pena

  return {
    misurato: formattaSecondi(sec),
    corretto: formattaSecondi(corretto),
    secondi: corretto,
    stop: Math.round(stop * 10) / 10,
    ignota: !!e.ignota,
    nota: e.nota || null,
  };
}

// ─── FILTRI ─────────────────────────────────────────────────

/**
 * Fattore di filtro in stop. Chi scatta in bianco e nero con filtri
 * colorati fa questa somma a mente a ogni scatto: e' una fonte di
 * errore ricorrente, e il dato non finisce da nessuna parte.
 */
export const FILTRI = [
  { id: '', nome: 'nessuno', stop: 0 },
  { id: 'giallo', nome: 'giallo', stop: 1 },
  { id: 'arancio', nome: 'arancio', stop: 2 },
  { id: 'rosso', nome: 'rosso', stop: 3 },
  { id: 'verde', nome: 'verde', stop: 2 },
  { id: 'polar', nome: 'polarizzatore', stop: 1.5 },
  { id: 'nd2', nome: 'ND 2 stop', stop: 2 },
  { id: 'nd6', nome: 'ND 6 stop', stop: 6 },
  { id: 'nd10', nome: 'ND 10 stop', stop: 10 },
];

export function filtroDa(id) {
  return FILTRI.find((f) => f.id === id) || FILTRI[0];
}

// ─── NUMERO D'ARCHIVIO ──────────────────────────────────────

/**
 * Identificativo progressivo per anno: 2026-014. Va sulla busta del
 * negativo, sul foglio contatti, sul nome del file di scansione — e'
 * cio' che rende un rullino rintracciabile a distanza di anni.
 */
export function prossimoArchivio(rullini) {
  const anno = new Date().getFullYear();
  const usati = rullini
    .map((r) => r.archivio)
    .filter((a) => a && a.startsWith(`${anno}-`))
    .map((a) => Number(a.split('-')[1]) || 0);
  const n = usati.length ? Math.max(...usati) + 1 : 1;
  return `${anno}-${String(n).padStart(3, '0')}`;
}
