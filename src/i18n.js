// i18n.js — lightweight localization for SheetQL (no dependencies)

const messages = {
  en: {
    themeLight: "Light",
    themeDark: "Dark",
    themeLightChocolate: "Light chocolate",
    themeDarkChocolate: "Dark chocolate",
    dbInitializing: "Initializing DuckDB\u2026",
    dbReady: "Ready",
    dbFailed: "Failed to start",
    uploadTitle: "Upload workbook",
    chooseFile: "Choose file",
    dropHint: "or drop a file here",
    multiFileHint: "You can upload multiple files to add them as tables.",
    tablesTitle: "Tables",
    clear: "Delete all",
    removeTable: "Remove table",
    removingTable: "Removing table…",
    tableRemoved: "Table removed.",
    removeFailed: "Failed to remove table: {err}",
    noTables: "No tables yet.",
    toggleColumns: "Show/hide columns",
    noRows: "No rows.",
    rows: { one: "{n} row", other: "{n} rows" },
    runQuery: "Run query",
    queryTab: "Query {n}",
    addQueryTab: "New query tab",
    closeTab: "Close tab",
    failed: "Failed.",
    result: "Result",
    statementOk: "Statement executed successfully.",
    sqlNote: { one: "{n} row.", other: "{n} rows." },
    sqlNoteFirstOf: "Showing first {a} of {b} rows. Download exports all {b} rows.",
    loadWorkbook: "Load workbook",
    headerQuestionSheet: "Does the first row contain column names?",
    yes: "Yes",
    no: "No",
    column: "Column",
    keyword: "Keyword",
    table: "Table",
    type: "Type",
    cancel: "Cancel",
    load: "Load",
    loading: "Loading\u2026",
    readingFile: "Reading {file}\u2026",
    loadingSheet: "Loading sheet \"{sheet}\" ({n} rows)\u2026",
    skippedEmpty: "Skipped empty sheet \"{sheet}\"",
    noData: "No data found in the workbook.",
    loadedTables: { one: "Loaded {n} table.", other: "Loaded {n} tables." },
    loadFailed: "Failed to load workbook: {err}",
    preparingDownload: "Preparing download\u2026",
    downloadFailed: "Download failed: {err}",
    droppingTables: "Dropping tables\u2026",
    allCleared: "All tables cleared.",
    duckdbFailed: "Could not start DuckDB: {err}",
    export: "Export",
    formatExcel: "Excel (.xlsx)",
    formatCsv: "CSV (.csv)",
    formatOds: "ODS (.ods)",
    formatSql: "Format SQL",
    pasteData: "Paste data",
    pasteNameLabel: "Table name",
    tableNameLabel: "Table name",
    pasteHint: "Paste CSV, TSV, or JSON data",
    importThisSheet: "Import this sheet",
    selectAll: "Select all",
    statementsOk: { one: "{n} statement executed.", other: "{n} statements executed." },
    statementFailed: "Statement {n} failed: {err}",
  },

  es: {
    themeLight: "Claro",
    themeDark: "Oscuro",
    themeLightChocolate: "Chocolate claro",
    themeDarkChocolate: "Chocolate oscuro",
    dbInitializing: "Inicializando DuckDB\u2026",
    dbReady: "Listo",
    dbFailed: "Error al iniciar",
    uploadTitle: "Subir libro de trabajo",
    chooseFile: "Elegir archivo",
    dropHint: "o suelta un archivo aqu\u00ed",
    multiFileHint: "Puedes subir varios archivos para a\u00f1adirlos como tablas.",
    tablesTitle: "Tablas",
    clear: "Eliminar todo",
    removeTable: "Eliminar tabla",
    removingTable: "Eliminando tabla…",
    tableRemoved: "Tabla eliminada.",
    removeFailed: "No se pudo eliminar la tabla: {err}",
    noTables: "A\u00fan no hay tablas.",
    toggleColumns: "Mostrar/ocultar columnas",
    noRows: "Sin filas.",
    rows: { one: "{n} fila", other: "{n} filas" },
    runQuery: "Ejecutar consulta",
    queryTab: "Consulta {n}",
    addQueryTab: "Nueva pesta\u00f1a de consulta",
    closeTab: "Cerrar pesta\u00f1a",
    failed: "Error.",
    result: "Resultado",
    statementOk: "Instrucci\u00f3n ejecutada correctamente.",
    sqlNote: { one: "{n} fila.", other: "{n} filas." },
    sqlNoteFirstOf: "Mostrando las primeras {a} de {b} filas. La descarga exporta las {b} filas.",
    loadWorkbook: "Cargar libro de trabajo",
    headerQuestionSheet: "\u00bfLa primera fila contiene los nombres de las columnas?",
    yes: "S\u00ed",
    no: "No",
    column: "Columna",
    keyword: "Palabra clave",
    table: "Tabla",
    type: "Tipo",
    cancel: "Cancelar",
    load: "Cargar",
    loading: "Cargando\u2026",
    readingFile: "Leyendo {file}\u2026",
    loadingSheet: "Cargando hoja \"{sheet}\" ({n} filas)\u2026",
    skippedEmpty: "Hoja vac\u00eda omitida \"{sheet}\"",
    noData: "No se encontraron datos en el libro de trabajo.",
    loadedTables: { one: "Cargada {n} tabla.", other: "Cargadas {n} tablas." },
    loadFailed: "No se pudo cargar el libro de trabajo: {err}",
    preparingDownload: "Preparando descarga\u2026",
    downloadFailed: "Error al descargar: {err}",
    droppingTables: "Eliminando tablas\u2026",
    allCleared: "Todas las tablas eliminadas.",
    duckdbFailed: "No se pudo iniciar DuckDB: {err}",
    export: "Exportar",
    formatExcel: "Excel (.xlsx)",
    formatCsv: "CSV (.csv)",
    formatOds: "ODS (.ods)",
    formatSql: "Formatear SQL",
    pasteData: "Pegar datos",
    pasteNameLabel: "Nombre de la tabla",
    tableNameLabel: "Nombre de la tabla",
    pasteHint: "Pega datos CSV, TSV o JSON",
    importThisSheet: "Importar esta hoja",
    selectAll: "Seleccionar todo",
    statementsOk: { one: "{n} instrucci\u00f3n ejecutada.", other: "{n} instrucciones ejecutadas." },
    statementFailed: "La instrucci\u00f3n {n} fall\u00f3: {err}",
  },

  de: {
    themeLight: "Hell",
    themeDark: "Dunkel",
    themeLightChocolate: "Helle Schokolade",
    themeDarkChocolate: "Dunkle Schokolade",
    dbInitializing: "DuckDB wird initialisiert\u2026",
    dbReady: "Bereit",
    dbFailed: "Start fehlgeschlagen",
    uploadTitle: "Arbeitsmappe hochladen",
    chooseFile: "File-Datei ausw\u00e4hlen",
    dropHint: "oder Datei hierher ziehen",
    multiFileHint: "Sie k\u00f6nnen mehrere Dateien hochladen, um sie als Tabellen hinzuzuf\u00fcgen.",
    tablesTitle: "Tabellen",
    clear: "Alle löschen",
    removeTable: "Tabelle entfernen",
    removingTable: "Tabelle wird entfernt…",
    tableRemoved: "Tabelle entfernt.",
    removeFailed: "Tabelle konnte nicht entfernt werden: {err}",
    noTables: "Noch keine Tabellen.",
    toggleColumns: "Spalten ein-/ausblenden",
    noRows: "Keine Zeilen.",
    rows: { one: "{n} Zeile", other: "{n} Zeilen" },
    runQuery: "Abfrage ausf\u00fchren",
    queryTab: "Abfrage {n}",
    addQueryTab: "Neue Abfrage-Registerkarte",
    closeTab: "Registerkarte schlie\u00dfen",
    failed: "Fehlgeschlagen.",
    result: "Ergebnis",
    statementOk: "Anweisung erfolgreich ausgef\u00fchrt.",
    sqlNote: { one: "{n} Zeile.", other: "{n} Zeilen." },
    sqlNoteFirstOf: "Die ersten {a} von {b} Zeilen werden angezeigt. Der Download exportiert alle {b} Zeilen.",
    loadWorkbook: "Arbeitsmappe laden",
    headerQuestionSheet: "Enth\u00e4lt die erste Zeile die Spaltennamen?",
    yes: "Ja",
    no: "Nein",
    column: "Spalte",
    keyword: "Schl\u00fcsselwort",
    table: "Tabelle",
    type: "Typ",
    cancel: "Abbrechen",
    load: "Laden",
    loading: "Wird geladen\u2026",
    readingFile: "{file} wird gelesen\u2026",
    loadingSheet: "Tabelle \"{sheet}\" wird geladen ({n} Zeilen)\u2026",
    skippedEmpty: "Leere Tabelle \"{sheet}\" \u00fcbersprungen",
    noData: "Keine Daten in der Arbeitsmappe gefunden.",
    loadedTables: { one: "{n} Tabelle geladen.", other: "{n} Tabellen geladen." },
    loadFailed: "Arbeitsmappe konnte nicht geladen werden: {err}",
    preparingDownload: "Download wird vorbereitet\u2026",
    downloadFailed: "Download fehlgeschlagen: {err}",
    droppingTables: "Tabellen werden gel\u00f6scht\u2026",
    allCleared: "Alle Tabellen gel\u00f6scht.",
    duckdbFailed: "DuckDB konnte nicht gestartet werden: {err}",
    export: "Exportieren",
    formatExcel: "Excel (.xlsx)",
    formatCsv: "CSV (.csv)",
    formatOds: "ODS (.ods)",
    formatSql: "SQL formatieren",
    pasteData: "Daten einf\u00fcgen",
    pasteNameLabel: "Tabellenname",
    tableNameLabel: "Tabellenname",
    pasteHint: "CSV-, TSV- oder JSON-Daten einf\u00fcgen",
    importThisSheet: "Diese Tabelle importieren",
    selectAll: "Alle ausw\u00e4hlen",
    statementsOk: { one: "{n} Anweisung ausgef\u00fchrt.", other: "{n} Anweisungen ausgef\u00fchrt." },
    statementFailed: "Anweisung {n} fehlgeschlagen: {err}",
  },

  fr: {
    themeLight: "Clair",
    themeDark: "Sombre",
    themeLightChocolate: "Chocolat clair",
    themeDarkChocolate: "Chocolat fonc\u00e9",
    dbInitializing: "Initialisation de DuckDB\u2026",
    dbReady: "Pr\u00eat",
    dbFailed: "\u00c9chec du d\u00e9marrage",
    uploadTitle: "Importer un classeur",
    chooseFile: "Choisir un fichier",
    dropHint: "ou d\u00e9posez un fichier ici",
    multiFileHint: "Vous pouvez importer plusieurs fichiers pour les ajouter en tant que tables.",
    tablesTitle: "Tables",
    clear: "Tout supprimer",
    removeTable: "Supprimer la table",
    removingTable: "Suppression de la table…",
    tableRemoved: "Table supprimée.",
    removeFailed: "Échec de la suppression de la table : {err}",
    noTables: "Aucune table pour le moment.",
    toggleColumns: "Afficher/masquer les colonnes",
    noRows: "Aucune ligne.",
    rows: { one: "{n} ligne", other: "{n} lignes" },
    runQuery: "Ex\u00e9cuter la requ\u00eate",
    queryTab: "Requ\u00eate {n}",
    addQueryTab: "Nouvel onglet de requ\u00eate",
    closeTab: "Fermer l'onglet",
    failed: "\u00c9chec.",
    result: "R\u00e9sultat",
    statementOk: "Instruction ex\u00e9cut\u00e9e avec succ\u00e8s.",
    sqlNote: { one: "{n} ligne.", other: "{n} lignes." },
    sqlNoteFirstOf: "Affichage des {a} premi\u00e8res lignes sur {b}. Le t\u00e9l\u00e9chargement exporte les {b} lignes.",
    loadWorkbook: "Charger le classeur",
    headerQuestionSheet: "La premi\u00e8re ligne contient-elle les noms des colonnes ?",
    yes: "Oui",
    no: "Non",
    column: "Colonne",
    keyword: "Mot-cl\u00e9",
    table: "Table",
    type: "Type",
    cancel: "Annuler",
    load: "Charger",
    loading: "Chargement\u2026",
    readingFile: "Lecture de {file}\u2026",
    loadingSheet: "Chargement de la feuille \u00ab {sheet} \u00bb ({n} lignes)\u2026",
    skippedEmpty: "Feuille vide ignor\u00e9e \u00ab {sheet} \u00bb",
    noData: "Aucune donn\u00e9e trouv\u00e9e dans le classeur.",
    loadedTables: { one: "{n} table charg\u00e9e.", other: "{n} tables charg\u00e9es." },
    loadFailed: "\u00c9chec du chargement du classeur : {err}",
    preparingDownload: "Pr\u00e9paration du t\u00e9l\u00e9chargement\u2026",
    downloadFailed: "\u00c9chec du t\u00e9l\u00e9chargement : {err}",
    droppingTables: "Suppression des tables\u2026",
    allCleared: "Toutes les tables ont \u00e9t\u00e9 supprim\u00e9es.",
    duckdbFailed: "Impossible de d\u00e9marrer DuckDB : {err}",
    export: "Exporter",
    formatExcel: "Excel (.xlsx)",
    formatCsv: "CSV (.csv)",
    formatOds: "ODS (.ods)",
    formatSql: "Formater le SQL",
    pasteData: "Coller des donn\u00e9es",
    pasteNameLabel: "Nom de la table",
    tableNameLabel: "Nom de la table",
    pasteHint: "Collez des donn\u00e9es CSV, TSV ou JSON",
    importThisSheet: "Importer cette feuille",
    selectAll: "Tout s\u00e9lectionner",
    statementsOk: { one: "{n} instruction ex\u00e9cut\u00e9e.", other: "{n} instructions ex\u00e9cut\u00e9es." },
    statementFailed: "L'instruction {n} a \u00e9chou\u00e9 : {err}",
  },
};

const labels = {
  en: "English",
  es: "Espa\u00f1ol",
  de: "Deutsch",
  fr: "Fran\u00e7ais",
};

const available = Object.keys(messages);
const STORAGE_KEY = "sheetql.lang";

let current = "en";
let pluralRules = null;

function resolveKey(locale, key) {
  if (Object.prototype.hasOwnProperty.call(messages[locale], key)) {
    return messages[locale][key];
  }
  if (locale !== "en" && Object.prototype.hasOwnProperty.call(messages.en, key)) {
    return messages.en[key];
  }
  return undefined;
}

function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (match, name) => {
    if (!Object.prototype.hasOwnProperty.call(params, name)) return match;
    const value = params[name];
    return typeof value === "number" ? formatNumber(value) : String(value);
  });
}

function t(key, params) {
  let msg = resolveKey(current, key);
  if (msg === undefined) return key;

  if (typeof msg === "object" && msg !== null) {
    const n = params && typeof params.n === "number" ? params.n : 1;
    if (!pluralRules) pluralRules = new Intl.PluralRules(current);
    const form = pluralRules.select(n);
    msg = msg[form] || msg.other || Object.values(msg)[0];
  }

  return interpolate(msg, params);
}

function formatNumber(n) {
  return Number(n).toLocaleString(current);
}

function applyStatic() {
  document.documentElement.lang = current;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
}

function buildMenu() {
  const menu = document.getElementById("langMenu");
  if (!menu) return;
  menu.innerHTML = available
    .map(
      (l) =>
        `<li><button type="button" class="dropdown-item${l === current ? " active" : ""}" data-lang="${l}">${labels[l]}</button></li>`
    )
    .join("");
  menu.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => setLocale(btn.getAttribute("data-lang")));
  });
}

function updateLabel() {
  const label = document.getElementById("langLabel");
  if (label) label.textContent = labels[current];
}

function setLocale(locale) {
  if (!available.includes(locale)) locale = "en";
  current = locale;
  pluralRules = null;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch (e) {
    /* ignore */
  }
  applyStatic();
  buildMenu();
  updateLabel();
  document.dispatchEvent(new CustomEvent("sheetql:localechange"));
}

function detectLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && available.includes(stored)) return stored;
  } catch (e) {
    /* ignore */
  }
  const nav = (navigator.language || "en").toLowerCase();
  const base = nav.split("-")[0];
  return available.includes(base) ? base : "en";
}

function init() {
  setLocale(detectLocale());
}

export { t, formatNumber, setLocale, init, labels, available };
