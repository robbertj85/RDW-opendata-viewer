# 🚗 RDW Open Data Viewer with Claude AI

A professional web-based viewer for the Dutch RDW (Rijksdienst voor het Wegverkeer) Open Data API with AI-powered natural language queries using Claude.

## Features

### 🎯 Core Features
- **170+ searchable columns** across all RDW datasets
- **Custom dropdown** with keyboard navigation (shows 10+ items)
- **Sort functionality** (A-Z, Z-A, by count)
- **Copy to clipboard** (table data + JSON)
- **Professional design** (blue/black/grey color scheme)

### 🤖 AI-Powered Queries
- **Natural language interface** - Ask questions in plain Dutch/English
- **Claude integration** - Translates questions to RDW API queries
- **Auto-execution** - Queries are automatically executed and displayed

### 📊 Query Types
1. **Unique Values** - Get all unique values for a column
2. **Count per Category** - Count records grouped by value
3. **Pivot Analysis** - Cross-tabulate data (same dataset only)

### 🗂️ Datasets Included
- Gekentekende voertuigen (main) - `m9d7-ebf2`
- Brandstof & Emissie - `8ys7-d773`
- Carrosserie - `vezc-m2t6`
- Carrosserie Specifiek - `jhie-znh9`
- Voertuigklasse - `kmfi-hrps`
- Assen - `3huj-srit`
- Gebreken - `w4rt-e856`

## Setup

### 1. Install Dependencies

```bash
cd /Users/robbertjanssen/Documents/dev/rdw-opendata
npm install
```

### 2. Make Sure Claude Code is Installed

The server uses your existing Claude Code installation (no API key needed!):

```bash
# Check if Claude Code is installed
claude --version
```

If not installed, follow the instructions at https://claude.ai/download

### 3. Start the Claude Server

```bash
npm start
# or
node claude-server.js
```

You should see:
```
╔══════════════════════════════════════════════════════════╗
║  🚗 Claude RDW Query Server                              ║
║                                                          ║
║  Running on: http://localhost:3000                      ║
║  Endpoint:   http://localhost:3000/query                ║
║                                                          ║
║  Ready to translate natural language queries to RDW API! ║
╚══════════════════════════════════════════════════════════╝
```

### 4. Open the Viewer

Simply open `rdw-viewer.html` in your browser:

```bash
open rdw-viewer.html
```

## Usage

### AI-Powered Queries

**Example questions you can ask:**

```
"Hoeveel elektrische auto's zijn er geregistreerd?"
"Top 10 automerken met de meeste voertuigen"
"Toon alle emissieklassen"
"Welke carrosserietypen zijn er?"
"Aantal voertuigen per merk"
"Hoeveel Tesla's zijn er in Nederland?"
```

**How it works:**
1. Type your question in the AI prompt field
2. Click "🚀 Vraag Claude & Voer Query Uit"
3. Claude analyzes your question and generates a query
4. The query is automatically executed
5. Results are displayed in the table below

### Manual Queries

You can also query manually:
1. Select a column from the dropdown (start typing to search)
2. Choose a limit (10, 50, 100, etc. or unlimited)
3. Click one of the action buttons:
   - 📊 Haal Unieke Waarden Op
   - 🔢 Tel Per Categorie
   - 📈 Pivot Analyse

## API Response Format

The Claude server expects this response format:

```json
{
  "interpretation": "User wants to know the top 10 car brands",
  "query": {
    "dataset": "m9d7-ebf2",
    "column": "merk",
    "operation": "count",
    "limit": 10
  }
}
```

For pivot queries:

```json
{
  "interpretation": "User wants body types pivoted by vehicle type",
  "query": {
    "dataset": "vezc-m2t6",
    "column": "carrosserietype",
    "operation": "pivot",
    "pivotDataset": "m9d7-ebf2",
    "pivotColumn": "voertuigsoort",
    "limit": 50
  }
}
```

## Data Model - Dataset Relationships

<details>
<summary><strong>Click to view complete database diagram</strong></summary>

```
┌─────────────────────────────────────────────────────────────────────┐
│ VOERTUIGEN (m9d7-ebf2) - Main Vehicle Registration                 │
│ ─────────────────────────────────────────────────────────────────── │
│ 🔑 kenteken                                                         │
│    voertuigsoort                                                    │
│    merk                                                             │
│    handelsbenaming                                                  │
│    vervaldatum_apk                                                  │
│    datum_tenaamstelling                                             │
│    bruto_bpm                                                        │
│    inrichting                                                       │
│    aantal_zitplaatsen                                               │
│    eerste_kleur                                                     │
│    tweede_kleur                                                     │
│    aantal_cilinders                                                 │
│    cilinderinhoud                                                   │
│    massa_ledig_voertuig                                             │
│    toegestane_maximum_massa_voertuig                                │
│    massa_rijklaar                                                   │
│    maximum_massa_trekken_ongeremd                                   │
│    maximum_trekken_massa_geremd                                     │
│    datum_eerste_toelating                                           │
│    datum_eerste_tenaamstelling_in_nederland                         │
│    wacht_op_keuren                                                  │
│    catalogusprijs                                                   │
│    wam_verzekerd                                                    │
│    maximale_constructiesnelheid                                     │
│    laadvermogen                                                     │
│    oplegger_geremd                                                  │
│    aanhangwagen_autonoom_geremd                                     │
│    aanhangwagen_middenas_geremd                                     │
│    aantal_staanplaatsen                                             │
│    aantal_deuren                                                    │
│    aantal_wielen                                                    │
│    afstand_hart_koppeling_tot_achterzijde_voertuig                  │
│    afstand_voorzijde_voertuig_tot_hart_koppeling                    │
│    afwijkende_maximum_snelheid                                      │
│    lengte                                                           │
│    breedte                                                          │
│    europese_voertuigcategorie                                       │
│    europese_voertuigcategorie_toevoeging                            │
│    europese_uitvoeringcategorie_toevoeging                          │
│    plaats_chassisnummer                                             │
│    technische_max_massa_voertuig                                    │
│    type                                                             │
│    type_gasinstallatie                                              │
│    typegoedkeuringsnummer                                           │
│    variant                                                          │
│    uitvoering                                                       │
│    volgnummer_wijziging_eu_typegoedkeuring                          │
│    vermogen_massarijklaar                                           │
│    wielbasis                                                        │
│    export_indicator                                                 │
│    openstaande_terugroepactie_indicator                             │
│    vervaldatum_tachograaf                                           │
│    taxi_indicator                                                   │
│    maximum_massa_samenstelling                                      │
│    aantal_rolstoelplaatsen                                          │
│    maximum_ondersteunende_snelheid                                  │
│    jaar_laatste_registratie_tellerstand                             │
│    tellerstandoordeel                                               │
│    code_toelichting_tellerstandoordeel                              │
│    tenaamstellen_mogelijk                                           │
│    vervaldatum_apk_dt                                               │
│    datum_tenaamstelling_dt                                          │
│    datum_eerste_toelating_dt                                        │
│    datum_eerste_tenaamstelling_in_nederland_dt                      │
│    vervaldatum_tachograaf_dt                                        │
│    maximum_last_onder_de_vooras_sen_tezamen_koppeling               │
│    type_remsysteem_voertuig_code                                    │
│    rupsonderstelconfiguratiecode                                    │
│    wielbasis_voertuig_minimum                                       │
│    wielbasis_voertuig_maximum                                       │
│    lengte_voertuig_minimum                                          │
│    lengte_voertuig_maximum                                          │
│    breedte_voertuig_minimum                                         │
│    breedte_voertuig_maximum                                         │
│    hoogte_voertuig                                                  │
│    hoogte_voertuig_minimum                                          │
│    hoogte_voertuig_maximum                                          │
│    massa_bedrijfsklaar_minimaal                                     │
│    massa_bedrijfsklaar_maximaal                                     │
│    technisch_toelaatbaar_massa_koppelpunt                           │
│    maximum_massa_technisch_maximaal                                 │
│    maximum_massa_technisch_minimaal                                 │
│    subcategorie_nederland                                           │
│    verticale_belasting_koppelpunt_getrokken_voertuig                │
│    zuinigheidsclassificatie                                         │
│    registratie_datum_goedkeuring_afschrijvingsmoment_bpm            │
│    registratie_datum_goedkeuring_afschrijvingsmoment_bpm_dt         │
│    gem_lading_wrde                                                  │
│    aerodyn_voorz                                                    │
│    massa_alt_aandr                                                  │
│    verl_cab_ind                                                     │
│    aantal_passagiers_zitplaatsen_wettelijk                          │
│    aanwijzingsnummer                                                │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ 1:N (kenteken)
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ BRANDSTOF           │ │ CARROSSERIE         │ │ ASSEN               │
│ (8ys7-d773)         │ │ (vezc-m2t6)         │ │ (3huj-srit)         │
│ ─────────────────── │ │ ─────────────────── │ │ ─────────────────── │
│ 🔗 kenteken (FK)    │ │ 🔗 kenteken (FK)    │ │ 🔗 kenteken (FK)    │
│    brandstof_       │ │ 🔑 carrosserie_     │ │ 🔑 as_nummer        │
│      volgnummer     │ │      volgnummer     │ │    aantal_assen     │
│    brandstof_       │ │    type_carrosserie_│ │    aangedreven_as   │
│      omschrijving   │ │      europese_      │ │    hefas            │
│    brandstofverbruik│ │      omschrijving   │ │    plaatscode_as    │
│      _buiten_de_stad│ │    carrosserietype  │ │    spoorbreedte     │
│    brandstofverbruik│ │                     │ │    weggedrag_code   │
│      _gecombineerd  │ │                     │ │    wettelijk_       │
│    brandstofverbruik│ │                     │ │      toegestane_    │
│      _stad          │ │                     │ │      maximum_aslast │
│    co2_uitstoot_    │ │                     │ │    technisch_       │
│      gecombineerd   │ │                     │ │      toegestane_    │
│    co2_uitstoot_    │ │                     │ │      maximum_aslast │
│      gewogen        │ │                     │ │    geremde_as_      │
│    geluidsniveau_   │ │                     │ │      indicator      │
│      rijdend        │ └─────────────────────┘ └─────────────────────┘
│    geluidsniveau_             │
│      stationair               │ 1:N (kenteken + carrosserie_volgnummer)
│    emissieklasse              ├─────────────────────────┐
│    milieuklasse_eg_           │                         │
│      goedkeuring_licht        ▼                         ▼
│    milieuklasse_eg_   ┌─────────────────────┐ ┌─────────────────────┐
│      goedkeuring_zwaar│ CARROSSERIE SPEC    │ │ VOERTUIGKLASSE      │
│    uitstoot_deeltjes_ │ (jhie-znh9)         │ │ (kmfi-hrps)         │
│      licht            │ ─────────────────── │ │ ─────────────────── │
│    uitstoot_deeltjes_ │ 🔗 kenteken (FK)    │ │ 🔗 kenteken (FK)    │
│      zwaar            │ 🔗 carrosserie_     │ │ 🔗 carrosserie_     │
│    nettomaximum       │      volgnummer (FK)│ │      volgnummer (FK)│
│      vermogen         │ 🔑 carrosserie_     │ │ 🔑 carrosserie_     │
│    roetuitstoot       │      voertuig_nummer│ │      klasse_        │
│    emissie_co2_       │      _code_         │ │      volgnummer     │
│      gecombineerd_wltp│      volgnummer     │ │    voertuigklasse   │
│    emissie_co2_       │    carrosseriecode  │ │    voertuigklasse_  │
│      gewogen_         │    carrosserie_     │ │      omschrijving   │
│      gecombineerd_wltp│      voertuig_nummer│ └─────────────────────┘
│    brandstof_verbruik_│      _europese_     │
│      gecombineerd_wltp│      omschrijving   │
│    elektrisch_verbruik└─────────────────────┘
│      _enkel_elektrisch
│      _wltp
│    actie_radius_enkel_
│      elektrisch_wltp
│    klasse_hybride_
│      elektrisch_
│      voertuig
│    co2_emissieklasse
└─────────────────────┘


┌─────────────────────┐
│ GEBREKEN            │
│ (w4rt-e856)         │
│ ─────────────────── │
│ 🔑 gebrek_          │
│      identificatie  │
│    soort_erkenning  │
│                     │
│ ⚠️  No FK Link      │
│    Standalone       │
│    reference table  │
└─────────────────────┘

LEGEND:
  🔑 = Primary Key
  🔗 = Foreign Key
  FK = Foreign Key
  1:N = One-to-Many Relationship

RELATIONSHIPS:
  • VOERTUIGEN is the main/central table
  • BRANDSTOF, CARROSSERIE, and ASSEN link directly to VOERTUIGEN via kenteken
  • CARROSSERIE SPEC and VOERTUIGKLASSE link to CARROSSERIE via kenteken + carrosserie_volgnummer
  • GEBREKEN is a standalone reference table (no direct links)
```

</details>

## Architecture

```
┌─────────────────────┐
│   Browser           │
│  (rdw-viewer.html)  │
└──────────┬──────────┘
           │
           │ HTTP POST /query
           │ { prompt, context }
           ▼
┌─────────────────────┐
│  Node.js Server     │
│ (claude-server.js)  │
└──────────┬──────────┘
           │
           │ API Call
           │
           ▼
┌─────────────────────┐
│  Claude API         │
│  (Anthropic)        │
└──────────┬──────────┘
           │
           │ Structured Query
           │
           ▼
┌─────────────────────┐
│   RDW Open Data     │
│   API (Socrata)     │
└─────────────────────┘
```

## Troubleshooting

### Server won't start
- Check if port 3000 is available: `lsof -i :3000`
- Kill existing process: `kill -9 <PID>`
- Try a different port in `claude-server.js`

### CORS errors
- Make sure the server is running
- Check that CORS is enabled in `claude-server.js`
- Open browser console (F12) to see exact error

### Claude not responding
- Verify Claude Code is installed: `claude --version`
- Make sure you're logged in to Claude Code
- Check server console for error messages
- Try running `claude "test"` manually to verify it works

### Invalid queries
- Claude might need more context - rephrase your question
- Check the "Claude's interpretatie" section to see what was understood
- Use manual mode if AI query doesn't work

## Development

To modify the Claude prompt behavior, edit the `systemPrompt` in `claude-server.js`.

To add more datasets, update:
1. `DATASET_COLUMNS` in `rdw-viewer.html`
2. `DATASET_NAMES` in `rdw-viewer.html`

## License

MIT - Free to use and modify

## Credits

Built with:
- RDW Open Data API (Socrata SODA)
- Claude AI (Anthropic)
- Express.js
- Vanilla JavaScript
