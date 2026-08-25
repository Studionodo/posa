/**
 * components.jsx — componenti riusabili, linguaggio M3 Expressive.
 *
 * Nessuno di questi sa cosa sia IndexedDB o un rullino: ricevono valori
 * ed emettono eventi. Stili inline su variabili CSS: ogni componente e'
 * autosufficiente e non ci sono specificita' che si annullano tra file.
 */

const V = (n) => `var(--${n})`;

// ─── Label ──────────────────────────────────────────────────

export function Label({ children, colore, style }) {
  return (
    <div className="label" style={{ color: colore || V('on-surface-var'), marginBottom: 10, ...style }}>
      {children}
    </div>
  );
}

// ─── Chip ───────────────────────────────────────────────────

export function Chip({ children, pieno }) {
  return (
    <span style={{
      fontFamily: V('corpo'), fontSize: V('t-label'), fontWeight: 600,
      letterSpacing: '0.07em', textTransform: 'uppercase',
      borderRadius: V('r-full'), padding: '6px 12px',
      background: pieno ? V('primary') : V('surf-cont-high'),
      color: pieno ? V('on-primary') : V('on-surface-var'),
    }}>{children}</span>
  );
}

// ─── Contatore ──────────────────────────────────────────────

/** Filetto che chiude la riga di lettura ai due lati. */
function Divisore({ colore }) {
  return <span style={{ flex: 1, height: 1, background: colore, opacity: 0.28, minWidth: 8 }} />;
}

/**
 * Perforazione 35mm. Nessuno possiede i buchi della pellicola: e' la
 * firma dell'app, e non prende in prestito l'identita' di nessuno.
 * Proporzione vicina alla KS reale: piu' larga che alta, angoli raccordati.
 */
export function Perforazione({ colore, n = 13, alt = 9, gap = 6, pad = '7px 10px' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap, padding: pad }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ height: alt, borderRadius: 2, background: colore }} />
      ))}
    </div>
  );
}

/**
 * Striscia di pellicola come misura del residuo: tante perforazioni
 * quante le pose, quelle scattate accese. Non e' decorazione, e' il
 * dato — quanta pellicola resta, detto nella lingua della pellicola.
 * La spaziatura si adatta al formato: un 120 da 12 pose non deve
 * sembrare un 35mm rado. Oltre le pose nominali la striscia non
 * cresce, si accende in cinabro.
 */
export function StrisciaPellicola({ totali, fatti, spento }) {
  const gap = totali > 24 ? 3 : totali > 12 ? 5 : 8;
  const oltre = fatti > totali;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${totali}, 1fr)`, gap, marginTop: 14 }}>
      {Array.from({ length: totali }).map((_, i) => {
        const esposta = i < fatti;
        return (
          <span key={i} style={{
            height: 8, borderRadius: 1.5,
            opacity: esposta && spento ? 0.5 : 1,
            background: !esposta ? V('surf-cont-high')
              : oltre ? V('critical')
              : spento ? V('on-surface-var') : V('primary'),
          }} />
        );
      })}
    </div>
  );
}

/**
 * Fotogramma vergine: la finestra non esposta. Per gli stati vuoti,
 * dove dice esattamente cio' che e'.
 */
export function FotogrammaVuoto({ children }) {
  return (
    <div style={{ borderRadius: V('r-lg'), overflow: 'hidden', background: V('surf-cont-low') }}>
      <Perforazione colore={V('surface')} alt={7} gap={6} pad="6px 10px" />
      <div style={{ padding: '24px 20px', textAlign: 'center', color: V('on-surface-var') }}>
        {children}
      </div>
      <Perforazione colore={V('surface')} alt={7} gap={6} pad="6px 10px" />
    </div>
  );
}

/**
 * Il fotogramma. Perfori sopra e sotto, posa e parametri in mezzo.
 * La riga di lettura serve perche' scorrendo verso la lista scatti i
 * valori selezionati escono dal campo visivo, e prima di registrare
 * bisogna sapere cosa si sta per scrivere senza cercare tre celle in
 * tre griglie diverse. Nessuna etichetta: il formato si identifica da se'.
 */
/**
 * Il fotogramma dorato e' l'identita' della schermata, non un ornamento:
 * il numero delle pose e' il dato che si legge con la coda dell'occhio.
 *
 * `compatto` lo riduce da ~180px a ~110px togliendo peso alla cifra ma
 * conservando perforazioni e riga di lettura. Serve quando sopra c'e'
 * gia' un'intestazione: due blocchi alti in cima schiacciano le griglie.
 */
/**
 * Il fotogramma: contorno, non blocco pieno.
 *
 * Era un rettangolo dorato pieno che occupava un quinto dello schermo.
 * Una superficie ampia e satura e' l'estetica dei temi "premium" di
 * dieci anni fa: il colore va usato come una linea, non come un
 * riempimento. Cosi' l'accento resta acceso perche' e' raro.
 *
 * Il colore invade l'intera superficie solo quando le pose sono
 * esaurite: li' l'allarme deve essere impossibile da ignorare.
 */
export function Contatore({ fatti, totali, pulse, tempo, diaframma, focale, formattaTempo, compatto }) {
  const esaurito = fatti >= totali;

  const letture = [
    tempo ? formattaTempo(tempo) : null,
    diaframma ? `f/${diaframma}` : null,
    focale ? `${focale}mm` : null,
  ].filter(Boolean);

  /* Bordo e perforazioni in arancio PIENO, non trasparente: il velo
     al 45% su fondo grigio-blu diventava marrone sporco. Un colore
     caldo steso su una superficie fredda produce fango — funziona
     solo come linea netta. */
  const bordo = esaurito ? V('critical') : V('primary');
  const cifra = esaurito ? V('critical') : V('primary');

  return (
    <div style={{ padding: compatto ? '8px 16px 10px' : '12px 16px 16px', flexShrink: 0 }}>
      <div style={{
        borderRadius: V('r-lg'), overflow: 'hidden',
        border: `1.5px solid ${bordo}`,
        background: esaurito ? 'rgba(192,57,43,0.08)' : V('primary-tint'),
        boxShadow: `inset 0 1px 0 ${V('luce-alto')}`,
        transform: pulse ? 'scale(1.015)' : 'scale(1)',
        transition: 'transform var(--molla-durata) var(--molla)',
      }}>
        <Perforazione colore={bordo} />

        <div style={{ padding: compatto ? '2px 20px 4px' : '6px 20px 8px', textAlign: 'center' }}>
          <div className="display" style={{
            fontSize: compatto ? 46 : V('t-contatore'), lineHeight: 0.92, fontWeight: 700,
            fontVariantNumeric: 'tabular-nums', color: cifra,
          }}>
            {fatti}<span style={{ color: V('on-surface-var'), fontWeight: 500 }}>/{totali}</span>
          </div>
        </div>

        {letture.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 14, padding: compatto ? '0 18px 8px' : '0 18px 10px',
          }}>
            <Divisore colore={V('outline')} />
            {letture.map((l, i) => (
              <span key={i} className="display" style={{
                fontSize: 21, fontWeight: 600, color: V('on-surface'),
                fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
              }}>{l}</span>
            ))}
            <Divisore colore={V('outline')} />
          </div>
        )}

        <Perforazione colore={bordo} />

        {fatti > totali && (
          <div className="label" style={{
            background: V('critical'), color: V('on-critical'),
            textAlign: 'center', padding: 8, marginBottom: 0,
          }}>Oltre le pose nominali</div>
        )}
      </div>
    </div>
  );
}

export function GrigliaValori({ etichetta, valori, valore, onChange, colonne = 5, altezzaCella }) {
  if (!valori || !valori.length) return null;
  return (
    <div style={{ padding: '16px 16px 0' }}>
      <Label>{etichetta}</Label>
      <div role="radiogroup" aria-label={etichetta} style={{
        display: 'grid', gridTemplateColumns: `repeat(${colonne}, 1fr)`, gap: 4,
      }}>
        {valori.map((v) => {
          const on = v === valore;
          return (
            <button key={v} type="button" role="radio" aria-checked={on}
              onClick={() => onChange(v)}
              style={{
                minHeight: altezzaCella || V('touch-min'), padding: 0,
                background: on ? V('primary-tint') : V('surf-cont'),
                color: on ? V('primary') : V('on-surface'),
                boxShadow: on ? `inset 0 0 0 1.5px ${V('primary')}` : 'none',
                borderRadius: on ? V('r-xl') : V('r-md'),
                transform: on ? 'scale(1.04)' : 'scale(1)',
                fontFamily: V('display'), fontSize: V('t-valore'),
                fontWeight: on ? 700 : 500, fontVariantNumeric: 'tabular-nums',
              }}>{v}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─── PulsanteAzione ─────────────────────────────────────────

/**
 * Pillola a raggio pieno, 72px. In fondo allo schermo, sempre
 * raggiungibile anche quando le griglie eccedono il viewport.
 * variante 'critica' = rosso (registra, elimina).
 * variante 'primaria' = giallo (salva, carica, crea).
 */
/**
 * Sfumatura sopra il piede: il contenuto che scorre svanisce invece di
 * finire tagliato di netto sotto il pulsante. Serve anche a dire che
 * sotto c'e' altro — un taglio netto sembra la fine della lista.
 *
 * pointerEvents: none e' obbligatorio, altrimenti intercetta i tap
 * sull'ultima card.
 */
export function Sfumatura({ altezza = 40, verso = 'alto' }) {
  const su = verso === 'alto';
  return (
    <div aria-hidden="true" style={{
      position: 'absolute', left: 0, right: 0, height: altezza,
      ...(su ? { top: -altezza } : { top: 0 }),
      background: `linear-gradient(to ${su ? 'top' : 'bottom'}, ${V('surface')}, transparent)`,
      pointerEvents: 'none', zIndex: 1,
    }} />
  );
}

/**
 * `variante` non indica pericolo ma peso: 'critica' e' l'azione
 * principale della schermata — chiara su scuro, il contrasto piu' alto
 * disponibile. Il rosso resta riservato a cio' che non si annulla.
 */
export function PulsanteAzione({ children, onClick, variante = 'critica', disabilitato, sfumatura = true, paddingBasso }) {
  const critica = variante === 'critica';
  return (
    <div style={{
      // Quando sotto c'e' un altro elemento (il Ko-fi in Home) la safe
      // area la assorbe quello, non questo.
      padding: paddingBasso === 0
        ? '8px 16px 0'
        : '8px 16px calc(16px + env(safe-area-inset-bottom))',
      flexShrink: 0, position: 'relative',
    }}>
      {sfumatura && <Sfumatura />}
      <button type="button" disabled={disabilitato}
        onClick={onClick}
        style={{
          width: '100%', minHeight: V('touch-registra'), borderRadius: V('r-full'),
          background: disabilitato ? V('surf-cont-high') : (critica ? V('azione') : V('primary')),
          color: disabilitato ? V('on-surface-var') : (critica ? V('on-azione') : V('on-primary')),
          fontFamily: V('display'), fontSize: 20, fontWeight: 700, letterSpacing: '0.06em',
        }}>{children}</button>
    </div>
  );
}

// ─── PulsanteTondo ──────────────────────────────────────────

export function PulsanteTondo({ children, onClick, etichetta }) {
  return (
    <button type="button" onClick={onClick} aria-label={etichetta} style={{
      width: 48, height: 48, minHeight: 48, borderRadius: V('r-full'),
      background: V('surf-cont'), color: V('on-surface'), fontSize: 20,
    }}>{children}</button>
  );
}

// ─── ListaScatti ────────────────────────────────────────────

/**
 * Il piu' recente in alto. Niente swipe e niente tap lungo: con i guanti
 * non si registrano. Modifica ed elimina sono due pulsanti espliciti da
 * 56px. I raggi asimmetrici dicono che le tre parti sono un oggetto solo.
 */
export function ListaScatti({ scatti, onModifica, onElimina, formattaTempo }) {
  if (!scatti.length) {
    return (
      <FotogrammaVuoto>
        Nessuno scatto.<br />Imposta tempo e diaframma, poi registra.
      </FotogrammaVuoto>
    );
  }

  const ordinati = [...scatti].sort((a, b) => b.numero - a.numero);

  return (
    <>
      {ordinati.map((s) => (
        <div key={s.id} style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          <div style={{
            flex: 1, padding: '14px 18px', minWidth: 0,
            background: V('surf-cont'),
            borderRadius: `var(--r-lg) var(--r-xs) var(--r-xs) var(--r-lg)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span className="display" style={{
                fontSize: 22, fontWeight: 700, color: V('primary'),
                fontVariantNumeric: 'tabular-nums',
              }}>{s.numero}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formattaTempo(s.tempo)} · f/{s.diaframma}
                {s.focale ? ` · ${s.focale}mm` : ''}
              </span>
            </div>
            {s.nota && (
              <div style={{
                color: V('on-surface-var'), fontSize: 13, marginTop: 4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{s.nota}</div>
            )}
          </div>
          <button onClick={() => onModifica(s)} aria-label={`Modifica posa ${s.numero}`}
            style={{
              width: 56, background: V('surf-cont'), color: V('on-surface-var'),
              fontSize: 19, borderRadius: V('r-xs'),
            }}>✎</button>
          <button onClick={() => onElimina(s.id)} aria-label={`Elimina posa ${s.numero}`}
            style={{
              width: 56, background: V('surf-cont'), color: V('critical'), fontSize: 17,
              borderRadius: `var(--r-xs) var(--r-lg) var(--r-lg) var(--r-xs)`,
            }}>✕</button>
        </div>
      ))}
    </>
  );
}
