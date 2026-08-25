# POSA — Handover completo

**Versione:** v43
**Data:** 12 agosto 2026
**Produzione:** https://posa-three.vercel.app
**Sorgente locale:** `C:\Users\nicol\posa`

---

## 1. Che cos'è

Posa è il libro mastro delle pose su pellicola. Un fotografo carica un rullino,
registra ogni scatto con tempo, diaframma, focale, filtro e una nota, poi
registra lo sviluppo e archivia. Tutto offline, nessun account, nessun dato
raccolto.

**Tagline:** *Prima che la leva avanzi.*

Progetto personale di Nicola Papa, dal 12 agosto 2026 parte dell'ecosistema
Istante Labs. PWA in produzione; pubblicazione su Play Store differita a dopo
Momento, sotto lo stesso account sviluppatore.

---

## 2. Il principio che tiene insieme l'interfaccia

> **Le azioni su UN rullino stanno dentro il rullino, nel menu ⋯.
> La selezione in lista serve solo a fare la stessa cosa su PIÙ rullini insieme.**

Da qui discende tutto. Aprendo un rullino dall'Archivio si arriva alla stessa
schermata che si apre dalla Home, con lo stesso menu: chi ha imparato a
stampare un rullino in corso sa già come stampare un rullino sviluppato.

**Un vocabolario solo.** Gli stati sono tre e si chiamano allo stesso modo
ovunque: **IN CORSO → FINITO → SVILUPPATO**. La parola «archivia» non esiste
nell'interfaccia: non era un'azione ma la conseguenza di uno stato.

Questo principio è nato da una segnalazione precisa di Nicola — «non si capisce
più niente, non sai dove andare e cosa cercare» — dopo che l'app aveva accumulato
funzioni messe dove era comodo implementarle invece che dove uno le cerca.

---

## 3. Architettura

```
posa/
├── index.html                  viewport-fit=cover, theme-color #14100C
├── package.json                vite 5.4 + react 18
├── vite.config.js
├── public/
│   ├── manifest.json           name esteso, short_name "Posa"
│   ├── sw.js                   CACHE 'posa-v40' + PRECACHE
│   ├── privacy.html
│   ├── posa-logo-completo.png
│   └── icons/                  192, 512, maskable-512 + camera.svg (sorgente)
└── src/
    ├── main.jsx           23   bootstrap, richiediPersistenza, SW
    ├── App.jsx           295   stato, persistenza, navigazione
    ├── lib/
    │   ├── model.js      494   modello dati, scale, calcoli
    │   ├── db.js         196   IndexedDB
    │   ├── stampa.js     223   scheda A4 via window.print()
    │   └── esporta.js    144   backup JSON, CSV
    ├── components/
    │   ├── components.jsx 350  Contatore, ListaScatti, PulsanteAzione…
    │   └── selettore.jsx  167  Selettore modale, VoceParametro
    ├── screens/
    │   ├── Home.jsx       322
    │   ├── Rullino.jsx    446
    │   ├── NuovoRullino.jsx 196
    │   ├── Archivio.jsx   196
    │   └── Sviluppo.jsx   127
    └── styles/
        ├── tokens.css          palette, tipografia, reset
        └── stampa.css          @media print
```

**Nessun router:** la navigazione è `useState` in `App.jsx` con sei viste —
`home`, `rullino`, `nuovo`, `modifica`, `sviluppo`, `archivio`.

---

## 4. Modello dati

### Rullino
`id, nome, pellicola, iso_nominale, iso_esposizione, formato, pose_totali,
corpo, obiettivo, focali[], archivio, stato, data_inizio, data_fine, sviluppo`

### Scatto
`id, rullino_id, numero, tempo, diaframma, focale, nota, filtro, ei_override,
timestamp`

### Sviluppo (dentro il rullino)
`rivelatore, diluizione, minuti, gradi, agitazione, laboratorio, note`

### Scale
| | valori | note |
|---|---|---|
| Tempi | 21 | da 1/8000 a 60″ più posa B, stop pieni |
| Diaframmi | 18 | include le aperture massime reali f/1.2, f/1.8, f/3.5, f/4.5 |
| Focali | 45 | da 8 a 1000mm, comprese quelle del medio formato |
| Filtri | 9 | con fattore in stop |
| Rivelatori | 10 | suggerimenti tappabili |
| Agitazioni | 5 | suggerimenti tappabili |
| Emulsioni reciprocità | 13 | valori dalle schede tecniche dei produttori |

**Formati:** `35mm`, `mezzo` (etichetta ½, 72 pose), `120`.
**Stati:** `in_corso`, `finito`, `sviluppato`. Manuali solo i primi due.

---

## 5. Le funzioni fotografiche

### Difetto di reciprocità
Sopra il secondo di esposizione la pellicola perde sensibilità in modo non
lineare. Chi scatta all'alba senza correzione **sottoespone sistematicamente**,
e se ne accorge solo dopo lo sviluppo.

Modello `t_reale = t_misurato ^ p`, con `p` per famiglia di emulsione
riconosciuta dal nome scritto a mano sul rullino:

- **Acros** p=1.00, immune fino a 120s — il motivo per cui è la pellicola delle lunghe esposizioni
- **T-Max** 1.14 · **Delta** 1.16 — t-grain
- **HP5** 1.31 · **FP4** 1.26 · **Tri-X** 1.28 · **Pan F** 1.33 — b&n tradizionali
- **Portra** 1.10 · **Ektar** 1.12 · **Gold/ColorPlus** 1.15
- **Velvia** 1.30 (sopra 60s vira) · **Provia** 1.10 · **Ektachrome** 1.20
- Non riconosciuta: 1.28, prudente, **dichiarato in interfaccia**

Sono approssimazioni buone fino a qualche minuto. Oltre, conviene bracketare.

### Timer per le pose lunghe
Conseguenza diretta: se l'app dice che servono 47 secondi, deve anche contarli.
Senza, la correzione resta a metà — dice quanto esporre ma lascia a contare a
mente con l'otturatore aperto.

### Compensazione filtri
Giallo 1, arancio 2, rosso 3, verde 2, polarizzatore 1.5, ND 2/6/10.
Il dato è registrato sullo scatto e compare nella scheda stampata.

### Numero d'archivio
Progressivo per anno assegnato alla creazione: `2026-014`. Va sulla busta del
negativo, sul foglio contatti, sul nome del file di scansione. **In modifica non
si rigenera**: quel numero è già scritto sulla busta.

### Record di sviluppo
La metà mancante del libro mastro: si registrava l'esposizione con precisione e
poi lo sviluppo, che pesa altrettanto, non si registrava affatto. Salvare porta
il rullino a `sviluppato` e lo sposta in Archivio; **si resta sul rullino**,
perché è lì che si stampa con quei dati.

---

## 6. Sistema visivo

### Il concetto
Non è «fondo scuro con accento arancio»: **tutto ciò che si vede è illuminato
dalla luce di sicurezza della camera oscura.** L'ambiente è bruno perché è
quello che quella luce fa al buio; l'arancio non è appoggiato sopra, è la
sorgente.

**Nell'ecosistema Istante Labs:** Momento è l'oro della luce dell'alba prima
dello scatto, Tracce è il cinabro dell'inchiostro di chi legge dopo, Posa è
l'ambra sotto cui il negativo prende forma. Tre momenti dello stesso mestiere.

### Palette
```
--primary          #E8834A   luce di sicurezza, filtro ambra
--primary-dim      #C96A38
--on-primary       #1A0F08
--critical         #c0392b   solo per l'irreversibile
--on-critical      #f4f0e8

--surface          #14100C   luminanza 17
--surf-cont-low    #221A12              27
--surf-cont        #302518              38
--surf-cont-high   #40311F              51
--surf-cont-highest #543F27             66

--on-surface       #F2EDE5
--on-surface-var   #A3927D
--outline          #5A452C

--primary-tint     rgba(232,131,74,0.10)
--primary-border   rgba(232,131,74,0.55)
--luce-alto        rgba(255,232,200,0.07)

--azione           #F2EDE5   la carta bianca sotto l'ingranditore
--on-azione        #1E1710
```

**Escursione tonale 49 punti** (era 34), distacco fondo→card **21 punti**
(era 14). Era quella la causa della piattezza, non la temperatura.

### Regole di applicazione
- **Il colore è una linea, non un riempimento.** Superfici ampie e sature sono
  l'estetica dei temi «premium» di dieci anni fa. Il fotogramma è un contorno
  con un velo al 10%, i valori selezionati hanno bordo e testo colorati.
- **Il pieno resta solo dove c'è un'azione:** CARICA, REGISTRA, SALVA,
  SVILUPPATO — e tutti in `--azione` chiaro, non colorato.
- **Il rosso significa irreversibile.** Elimina, pose esaurite, avvisi. Mai
  su un gesto che si annulla.
- **La luce viene dall'alto:** filetto `--luce-alto` sul bordo superiore delle
  superfici sollevate. Niente ombre — su fondo scuro fanno sporco.

### Tipografia
- Display: **Playfair Display** 500/700
- Corpo: **Gelasio** 400/600
- Marchio: **Fraunces** (variabile, SOFT 0 WONK 1) — solo per «Posa.»
- **Mai Georgia, mai sans-serif**
- Etichette: 10px, letter-spacing 0.16em, peso 400, opacità 0.85 — arretrano
  perché è il valore il dato che si legge

### Scala dimensionale
| elemento | misura |
|---|---|
| Azione principale | 62px / 20pt |
| Marchio | 38pt |
| Titolo card | 19pt |
| Contatore card | 21pt |
| Voci parametro | 56px / 22pt |
| Schede | 40px |
| Padding card | 16px |
| Bersaglio minimo | 56px |

L'altezza serve al pollice, la dimensione del testo serve all'occhio: sono
esigenze diverse e massimizzarle entrambe rendeva il piede pesante.

---

## 6-bis. L'icona

**Soggetto:** corpo, pentaprisma, lente, perforazioni. Quattro segni, tutti a
contorno, tratto costante.

**Perché le perforazioni.** Senza di loro il disegno è l'icona fotocamera di
Material, Feather e Font Awesome: il segno più universale, quindi il più
anonimo. Potrebbe essere una galleria, una webcam, uno scanner. Le perforazioni
dicono *pellicola* invece che *fotocamera*, ed è quella la differenza fra l'app
di chiunque e questa.

**Sorgente vettoriale:** `public/icons/camera.svg` — le tre icone PNG si
rigenerano da lì con cairosvg.

**La lezione che conta: il tratto va dimensionato sulla resa piccola.** A 8px il
disegno era elegante a 1024 e spariva a 192, dove ne restava un pixel e mezzo.
Ora è 22px, che a dimensione launcher diventano quattro. Per la stessa ragione
le perforazioni sono sette e non nove: a 192px nove diventavano un tratteggio
indistinto.

**Un solo linguaggio.** Tutto a contorno. Unica eccezione motivata le
perforazioni piene: i fori della pellicola sono aperture, non contorni. Un
elemento pieno in mezzo a forme vuote senza una ragione si vede — un primo
tentativo aveva un puntino pieno per il pulsante di scatto ed era stonato.

**Centro ottico 18px sopra il centro geometrico:** una forma con un elemento in
cima appare più bassa di quanto sia.

**Maskable:** il disegno è al 73% dentro il quadrato, perché Android può
ritagliare fino a un terzo dai bordi.

**Trappole del vettoriale, se si torna a lavorarci:**
- Lo squircle disegnato con curve di Bézier a mano viene fuori come un cerchio.
  Va calcolata la superellisse vera con `n=5`, la stessa curva delle icone
  adattive Android
- I gradienti su un tratto verticale si spengono: il riquadro di delimitazione
  ha larghezza zero. Servono coordinate assolute (`gradientUnits="userSpaceOnUse"`)
- `feTurbulence` si comporta in modo diverso da un renderer all'altro: la grana,
  se serve, va aggiunta dopo il rendering

**Percorso scartato:** una versione fotorealistica con luce radente su un dorso
di reflex in tre quarti. Bella a 1024, illeggibile a 192 — piatta e senza
chiaroscuro la sagoma di un dorso resta una scatola. Conservata in
`logo/posa-camera.svg` se un giorno servisse per materiali di presentazione,
dove la dimensione non è un vincolo.

---

## 7. Le schermate

### Home
I rullini che si hanno per le mani — in corso e finiti. Header con marchio,
**SCEGLI** (✓) e **ARCHIVIO** (▤), entrambi con etichetta sotto: il simbolo da
solo veniva letto per quello che non era.

Filtro per stato solo se servono entrambi. Selezione: «Tutti» è anche il
contatore («3 di 5»). Piede: **SVILUPPATO** + **STAMPA**, con avviso in cinabro
se sono selezionati rullini ancora in corso — avvisa, non blocca.

Footer: `Offline · Nessun account · Nessun dato raccolto` e
`© 2026 Studionodo · Tutti i diritti riservati`.

### Rullino
Due schede — **Esposizione** e **Scatti** — perché registrare e consultare sono
gesti con ritmi opposti.

Fotogramma compatto in alto (contorno, ~110px), quattro **voci parametro** che
mostrano il proprio valore e aprono un `Selettore` modale, nota, e in fondo le
schede sopra REGISTRA.

Menu `⋯`: stato (2 pulsanti), modifica rullino, registra/modifica sviluppo,
stampa scheda, elimina. Chiusura con ✕ **dentro** il pannello e tocco fuori.

### Selettore
Pannello che sale dal basso, chip a flusso (`flexWrap`) — si dimensionano sul
testo e vanno a capo: overflow impossibile per costruzione. Maniglia, ✕, velo
scuro. `maxHeight: 90vh` perché i 21 tempi fanno sei righe.

### Archivio, NuovoRullino, Sviluppo
Archivio: stesse due colonne della Home, con RIPORTA IN LISTA al posto di
SVILUPPATO. Mostra il riassunto dello sviluppo sulla card — è la ragione per cui
ci si torna mesi dopo.

NuovoRullino serve sia a creare sia a modificare: la forma è identica, cambia
solo cosa succede al salvataggio.

Sviluppo: schermata dedicata con suggerimenti tappabili, e in cima il push/pull
se presente — è il primo dato che serve in camera oscura.

---

## 8. Deploy

```powershell
# 1 — estrarre lo zip e copiare il contenuto in C:\Users\nicol\posa
#     sostituendo i file esistenti. NON cancellare node_modules né .vercel

cd C:\Users\nicol\posa
npm run build          # deve finire con "✓ built in ..."
vercel --prod          # progetto: posa · env variables: n
```

**Se compare una cartella `posa` dentro `posa`:**
`Move-Item posa\* . -Force`

**Attenzione:** eseguire i comandi *dentro* `C:\Users\nicol\posa`. Lanciarli
dalla home sparpaglia i file nella cartella utente — è già successo, si recupera
con `Move-Item C:\Users\nicol\src C:\Users\nicol\posa\src -Force` e simili.

**Aggiornare sul telefono:** aprire l'app con connessione, attendere 30 secondi,
chiudere dalle recenti, riaprire. Per le icone e il manifest serve
**disinstallare e reinstallare** — Android li legge solo all'installazione.

---

## 9. Audit obbligatorio prima di ogni consegna

Nato dagli errori commessi, ognuno dei quali è costato un deploy:

1. **Sintassi** — parser Babel su tutti i file
2. **Import → export** — ogni nome importato esiste davvero nel modulo
3. **Namespace** — ogni `db.qualcosa()` corrisponde a una funzione esportata
4. **Componenti JSX** — ogni `<Componente>` è definito o importato
5. **Props** — dichiarate vs passate, per ogni schermata
6. **sw.js** — `node --check`
7. **manifest** — icone dichiarate presenti su disco, dimensioni corrette

---

## 10. Errori commessi e lezioni

| Errore | Causa | Lezione |
|---|---|---|
| `db.apri()` inesistente → schermata bianca | Nome dedotto invece che verificato | Verificare ogni chiamata contro gli export reali |
| `Label` e `stampaSchede` non disponibili in Rullino → schermata nera | Menu riscritto senza controllare il contesto | L'audit dei simboli, non solo della sintassi |
| `Sfumatura` non importata | Stesso errore ripetuto | L'audit l'ha intercettato prima della consegna |
| `viewport-fit=cover` rimosso | Corretto un sintomo senza capire la causa | Senza, `env(safe-area-inset-*)` resta a zero |
| Scale incomplete | Andato a memoria | Verificare con ricerca i dati tecnici |
| Palette fredda | Cambiate due variabili insieme | Il problema era la superficie, non la tinta |

**Il metodo che funziona:** misurare invece di stimare. La banda inferiore è
stata diagnosticata campionando i pixel di uno screenshot — `RGB(15,19,28)` è un
colore che non esiste nel codice, e quello ha detto che l'area non la dipingiamo
noi.

---

## 11. Decisioni chiuse — non si ridiscutono

- **IndexedDB, mai localStorage.** `db.apri()` non esiste: il database si apre
  da sé alla prima query, la persistenza la richiede `main.jsx`
- **`viewport-fit=cover` è necessario** — senza, le safe-area sono zero
- **56px è il bersaglio minimo** per il pollice con i guanti
- **Sviluppato non è un pulsante**, è la conseguenza di aver registrato lo sviluppo
- **Un solo campo di testo** sullo scatto: «Nota — soggetto, luce, intenzione»
- **Niente pannelli informativi.** Se serve una spiegazione, l'interfaccia ha fallito
- **Niente ritorno aptico** — inaffidabile su Android
- **`window.print()`, non jsPDF**
- **Anteprima generata dal codice di produzione**, non riscritta a mano

---

## 12. Debiti tecnici aperti

1. **Reimport del backup**: `ripristinaBackup()` esiste in `esporta.js` ma non ha
   interfaccia
2. **Export mai usati**: `getRullino`, `getRulliniInCorso`, `stimaSpazio`,
   `scaricaCsv`, `scaricaTesto`, `copiaNegliAppunti`, `formattaOra`,
   `svuotaScheda`, `stampaRullino`. Non sono difetti — lavoro già fatto in attesa
   di un pulsante
3. **`ei_override`** per singolo scatto è nel modello ma non esposto
4. **iOS non verificato**
5. **Stampa mai provata su Chrome Android reale**
6. **Barra di navigazione Android** `RGB(15,19,28)`: disegnata dal sistema,
   fuori dal nostro controllo. Con la palette calda si nota più di prima — è il
   costo della scelta
7. **Schermata d'avvio**: da Android 12 la impone il sistema, mostra l'icona
   dell'app. Tre tentativi di cambiarla via manifest sono falliti perché il
   meccanismo non lo consente
8. **Repository Git** da creare (privato) — la cronologia dei commit datata è la
   prova pratica di paternità del codice
9. **`LICENSE`** contiene `[INSERIRE NOME E COGNOME COMPLETI]` da sostituire

---

## 13. Sul futuro

**Play Store:** dopo Momento, stesso account sviluppatore, sotto brand Istante
Labs. Serve la migrazione ad Android nativo con Capacitor.

**Android XR:** valutato. Le PWA non sono supportate sugli occhiali, solo app
native; l'hardware arriva fra fine 2026 e 2027. Appunto per il futuro, non
lavoro per ora.

**Sequenza ecosistema:** Fiumarella (KDP) → Momento (Play Store) → Posa (Play
Store) → Controluce (KDP).
