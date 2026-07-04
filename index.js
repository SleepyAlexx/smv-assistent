// UPDATE: WA-Button ist jetzt 'WA verwalten' mit Auswahl für Aussetzen oder aktive Aussetzungen ansehen.
// UPDATE: Leaderpanel hat nur noch einen blauen WA-Button zum Aussetzen; der extra WA-Aussetzungen-Button wurde entfernt.
// UPDATE: Wochenabgabe kann durch Leader für 1–6 Wochen ausgesetzt werden; pausierte Wochen zählen nicht in der Übersicht.
// UPDATE: Leave-Nachricht pingt den User jetzt mit @, damit man direkt sieht wer geleavt ist.
// UPDATE: Abmeldungen werden nur um 00 Uhr geprüft und gelöscht; Bis-Datum wird im Format TT.MM.JJJJ erkannt.
// UPDATE: Abmeldungen werden automatisch einen Tag nach dem Bis-Datum gelöscht.
// FIX: Fehler bei /aufstellung-test und /aufstellung-erzwingen behoben: alte unsureUsers-Referenz in Aufstellung entfernt.
// FIX: Manueller Slash-Command /aufstellung-erzwingen eingebaut, der die heutige Aufstellung wirklich neu postet.
// FIX: Aufstellungsprüfung erstellt neu, wenn postedDates für heute existiert, aber die Discord-Nachricht fehlt.
// UPDATE: Ungewiss bei Aufstellungen komplett entfernt; nur noch Anwesend oder Abwesend.
// UPDATE: Bot-Status auf Made by Kquwi☦︎ gesetzt.
// UPDATE: Fußball-Event jetzt mit 2-Spalten-Design und Button zum Wiederöffnen nach versehentlicher Absage.
// UPDATE: Aufstellung jetzt mit 2-Spalten-Design und Button zum Wiederöffnen nach versehentlicher Absage.
// =====================================================
// SMV-Assistent | Komplettscript
// Registrierung + Join/Leave + Aufstellung + Leaderpanel/Sanktionen + Fußball-Events + Familienpanel + Wochenabgabe
//
// Datei: index.js
//
// WICHTIG:
// Für Join/Leave, Nicknames, Rollen und Member-Infos brauchst du:
// Discord Developer Portal -> Bot -> Privileged Gateway Intents
// ✅ Server Members Intent aktivieren
//
// Bot-Rechte auf Discord:
// ✅ Administrator reicht grundsätzlich
// ABER: Bot-Rolle muss über den Rollen stehen, die er vergeben soll.
// ABER: Bot-Rolle muss über User-Rollen stehen, deren Nickname er ändern soll.
//
// FIX: Sanktionen aus derselben Kategorie werden gesammelt und nicht ersetzt.
// UPDATE: Sanktionen können jetzt storniert/gelöscht werden.
// UPDATE: Leader-Logs wurden schöner formatiert.
// UPDATE: Überschrift ist jetzt 🚫 SANKTION 🚫.
// UPDATE: Fußball-Events sind jetzt im Familienpanel eingebaut und aus dem Leaderpanel entfernt.
// UPDATE: Aufstellungen markieren jetzt die SMV-Rolle; Fußball-Events markieren weiterhin @everyone.
// UPDATE: Fußball-Event-Formular wurde schöner benannt.
// UPDATE: ❌-Buttons bei Aufstellung und Fußball sind jetzt grau statt rot.
// UPDATE: Familienpanel mit Abmeldung eingebaut.
// UPDATE: Zahlende/r-Rolle wird automatisch verwaltet.
// UPDATE: Beim Bot-Start werden bestehende Mitglieder automatisch geprüft.
// UPDATE: Wochenabgabe-System mit Button, Logs, Korrektur und Sonntagsübersicht eingebaut.
// HINWEIS: Der automatische Zahlende/r-Start-Sync bleibt bewusst als Sicherheitsnetz drin.
// UPDATE: Wunsch/Vorschlag-Button wurde entfernt.
// UPDATE: Wochenabgabe-Logs zeigen jetzt den Discord-Namen und deutsche Zeitangaben.
// UPDATE: Sonntagsübersicht zeigt ebenfalls Namen und deutsche Zeitangaben.
// FIX: Wochenabgabe-Logs zeigen immer einen lesbaren Usernamen statt nur <@ID>.
// UPDATE: Wochenabgabe kann jetzt für 1 bis 6 Wochen im Voraus bestätigt werden.
// UPDATE: Abmeldungs-Embed wurde schöner und übersichtlicher gestaltet.
// UPDATE: Fußball-Event-Button im Familienpanel ist nur für die freigegebenen Rollen nutzbar.
// UPDATE: Fußball-Event steht im Familienpanel jetzt vor der Wochenabgabe.
// UPDATE: Aufstellungsdesign, Schließzeit, Absage-Button und Uhrzeit-Änderung eingebaut.
//
// Leader/Sanktionsrechte:
// Nur User mit einer dieser Rollen dürfen Sanktionen erstellen/bezahlt markieren:
// 1451315550394515516
// 1434318021412786317
// 1451629804221894868
// =====================================================

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const {
  Client,
  GatewayIntentBits,
  ActivityType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  UserSelectMenuBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

// =====================================================
// EINSTELLUNGEN
// =====================================================

const CONFIG = {
  botName: "SMV-Assistent",
  familyName: "Sedoij Medved",
  shortName: "SMV",

  nicknamePrefix: "SMV I",

  embedColor: 0x2b2d31,
  dangerColor: 0xff3b30,
  successColor: 0x2ecc71,
  warningColor: 0xf1c40f,

  // Registrierung / Join / Leave
  welcomeChannelId: "1434318022683922543",
  registrationChannelId: "1508266444390010890",
  leaveChannelId: "1451317175900962898",

  // Aufstellung
  lineupChannelId: "1451318638601830550",
  timezone: "Europe/Berlin",
  lineupStartTimeText: "20:30 - 21:00",
  lineupEventStartText: "jeden Tag um 20:30 Uhr",

  // Sanktionen
  sanctionChannelId: "1434318024646856758",
  sanctionLogChannelId: "1508286380403589131",
  sanctionDueDays: 7,

  // Fußball-Event-Channel
  footballEventChannelId: "1451331983459356836",

  // Familienpanel / Abmeldung
  absenceChannelId: "1434318024076296326",

  // Wochenabgabe / Zahlende/r Rollenautomatik
  familyMemberRoleId: "1451314176004984912",
  lineupMentionRoleId: "1451314176004984912",
  payerRoleId: "1508303859385372812",

  // Wochenabgabe-Log und Übersicht
  weeklyPaymentChannelId: "1508307008389124246",

  // Diese User bekommen keine Zahlende/r-Rolle
  payerExcludedUserIds: [
    "150268856105959424",
    "526066059258626049",
    "1418628359054688530",
  ],

  // Sobald ein User eine dieser Rollen hat, wird Zahlende/r entfernt
  payerExemptRoleIds: [
    "1434318021467439198",
    "1434318021467439196",
    "1451315550394515516",
    "1434318021412786317",
  ],

  // Rollen, die nach Registrierung automatisch vergeben werden
  registeredRoleIds: [
    "1451314176004984912",
    "1434318021412786308",
    "1508303859385372812",
  ],

  // Nur diese Rollen dürfen Leaderpanel/Sanktionen nutzen
  leaderRoleIds: [
    "1451315550394515516",
    "1434318021412786317",
    "1451629804221894868",
  ],

  // Nur diese Rollen dürfen über das Familienpanel Fußball-Events erstellen
  footballCreatorRoleIds: [
    "1455643015820480582",
    "1451629804221894868",
  ],
};

// =====================================================
// SANKTIONSLISTE
// amount = Geldbetrag als Zahl
// special = Sonderstrafe/Hinweis
// =====================================================

const SANCTIONS = [
  { id: "p12", section: "§12", label: "Wochenabgabe nicht abgegeben", amount: 150000, special: "Wochenabgabe" },
  { id: "p14", section: "§14", label: "Nicht im Funk sein, ohne Abmeldung", amount: 140000 },
  { id: "p15", section: "§15", label: "Nichttragen von GPS, ohne Absprache", amount: 140000 },
  { id: "p17", section: "§17", label: "Nichttragen der Familienkleidung (während Familienaktionen)", amount: 350000 },
  { id: "p18", section: "§18", label: "Nichteinhaltung der Funkdisziplin", amount: 140000 },
  { id: "p19", section: "§19", label: "Unangemessenes Verhalten in der Öffentlichkeit, das die Familie gefährdet", amount: 350000 },
  { id: "p21", section: "§21", label: "Unangemeldete Teilnahme an Aktivitäten, die die Familie gefährden", amount: 420000 },
  { id: "p22", section: "§22", label: "Beleidigungen jeglicher Art", amount: 150000 },
  { id: "p23", section: "§23", label: "fehlende Grundausstattung", amount: 170000 },
  { id: "p24", section: "§24", label: "Nach Up-Rank fragen", amount: 300000, special: "Downrank" },
  { id: "p26", section: "§26", label: "Zinken von Familienmitgliedern", amount: 200000 },
  { id: "p27", section: "§27", label: "Nicht reagieren auf Pflichtaufstellung", amount: 100000 },
  { id: "p28", section: "§28", label: "Waffe nicht zurückbringen", amount: 700000 },
  { id: "p29", section: "§29", label: "Missbrauch von Fraktionsgeldern für persönliche Zwecke", amount: 700000 },

  { id: "p31", section: "§31", label: "Respektlosigkeit innerhalb der Familie oder gegenüber der Leaderschaft", amount: 350000 },
  { id: "p32", section: "§32", label: "Nichteinhaltung von Befehlen während Missionen", amount: 280000 },
  { id: "p33", section: "§33", label: "Streitigkeiten und Unruhe stiften innerhalb der Familie", amount: 280000 },
  { id: "p34", section: "§34", label: "Unangemessenes Benehmen auf dem Anwesen", amount: 150000 },
  { id: "p35", section: "§35", label: "Unnötiges Schlagen oder Überfahren von Familienmitgliedern", amount: 200000 },
  { id: "p36", section: "§36", label: "Keine Disziplin bei Aufstellungen", amount: 300000 },
  { id: "p37", section: "§37", label: "Respektloses Verhalten gegenüber anderen Familien/Fremden", amount: 250000 },
  { id: "p38", section: "§38", label: "Missachtung eines Befehls der Leaderschaft", amount: 750000 },
  { id: "p39", section: "§39", label: "Schießen auf Familienmitglieder", amount: 500000 },
  { id: "p41", section: "§41", label: "Töten oder bewusstlos Schießen eines Familienmitglieds (grundlos)", amount: 0, special: "Bloodout" },
  { id: "p42", section: "§42", label: "Verkauf/Preisgabe der Familie", amount: 0, special: "Bloodout" },
  { id: "p43", section: "§43", label: "Unnötiges Schießen auf dem Anwesen", amount: 150000 },
  { id: "p44", section: "§44", label: "Privatgespräche im Funk", amount: 100000 },
  { id: "p45", section: "§45", label: "Alleingänge ohne Rücksprache bei Operationen", amount: 350000 },

  { id: "p46", section: "§46", label: "Versagen in kritischen Situationen aufgrund von Fahrlässigkeit", amount: 280000 },
  { id: "p47", section: "§47", label: "Nichtbefolgen von Einsatzbefehlen", amount: 280000 },
  { id: "p48", section: "§48", label: "Nichtmeldung von Feindkontakten während einer Operation", amount: 140000 },
  { id: "p49", section: "§49", label: "Verlassen des Einsatzortes oder Fußballspiels ohne Erlaubnis", amount: 140000 },
  { id: "p51", section: "§51", label: "Nicht reagieren im Funk auf einen Prontoruf", amount: 210000 },
  { id: "p52", section: "§52", label: "Missbrauch des Prontorufs", amount: 700000 },
  { id: "p53", section: "§53", label: "Einsammeln von Gefechtswaffen/Beständen ohne Rückgabe", amount: 0, special: "Bloodout" },
  { id: "p54", section: "§54", label: "Auf den Funker nicht hören", amount: 500000 },
  { id: "p55", section: "§55", label: "absichtliches Pitten in der Kolonne", amount: 150000 },
  { id: "p56", section: "§56", label: "Platten schießen gegenüber Familienmitgliedern", amount: 200000 },
  { id: "p57", section: "§57", label: "Fehlverhalten auf der Route", amount: 200000 },
  { id: "p58", section: "§58", label: "Kolonne nicht rechtzeitig aufgestellt", amount: 150000 },
  { id: "p59", section: "§59", label: "Sanktionen nicht rechtzeitig beglichen ohne triftigen Grund", amount: 0, special: "30% von der Sanktion" },
  { id: "p60", section: "§60", label: "Routenwache nach Aufforderung nicht gemacht (wird von der RV ausgesprochen)", amount: 100000 },
];

const SANCTION_MAP = new Map(SANCTIONS.map((s) => [s.id, s]));

// Zwischenspeicher für Leader, die gerade eine Sanktion erstellen
const sanctionDrafts = new Map();

// Cache für Wochenabgabe-Übersicht, damit Discord nicht bei jeder Übersicht alle Mitglieder neu laden muss.
let payerMembersCache = {
  fetchedAt: 0,
  members: [],
};

// =====================================================
// DATENBANK-GRUNDLAGE
// =====================================================

const dbPool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : null;

async function dbQuery(query, params = []) {
  if (!dbPool) {
    throw new Error("DATABASE_URL ist nicht gesetzt.");
  }

  return dbPool.query(query, params);
}

async function initDatabase() {
  if (!dbPool) {
    console.warn("⚠️ DATABASE_URL ist nicht gesetzt. Datenbank wird übersprungen.");
    return;
  }

  await dbQuery("SELECT NOW()");

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS bot_meta (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS weekly_payments (
      id BIGSERIAL PRIMARY KEY,
      week_key TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT,
      paid_at BIGINT NOT NULL,
      batch_id TEXT,
      batch_week_keys JSONB DEFAULT '[]'::jsonb,
      log_message_id TEXT,
      removed BOOLEAN NOT NULL DEFAULT FALSE,
      removed_at BIGINT,
      removed_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (week_key, user_id)
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS weekly_summaries (
      week_key TEXT PRIMARY KEY,
      posted_at BIGINT NOT NULL,
      reason TEXT,
      paid_count INTEGER NOT NULL DEFAULT 0,
      unpaid_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS lineups (
      date_key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      message_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS football_events (
      event_id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      message_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS sanctions (
      sanction_id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      message_id TEXT,
      paid BOOLEAN NOT NULL DEFAULT FALSE,
      cancelled BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("✅ PostgreSQL-Datenbank verbunden und Tabellen vorbereitet.");
}

// =====================================================
// SPEICHERDATEI
// =====================================================

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "smv-data.json");

function getDefaultData() {
  return {
    postedDates: {},
    lineups: {},
    sanctions: {},
    footballEvents: {},
    weeklyPayments: {},
    weeklySummaries: {},
    weeklyPaymentPauses: {},
    absences: {},
  };
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(getDefaultData(), null, 2));
  }
}

function loadData() {
  ensureDataFile();

  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return {
      ...getDefaultData(),
      ...data,
      postedDates: data.postedDates || {},
      lineups: data.lineups || {},
      sanctions: data.sanctions || {},
      footballEvents: data.footballEvents || {},
      weeklyPayments: data.weeklyPayments || {},
      weeklySummaries: data.weeklySummaries || {},
      weeklyPaymentPauses: data.weeklyPaymentPauses || {},
      absences: data.absences || {},
    };
  } catch (error) {
    console.error("❌ smv-data.json konnte nicht gelesen werden:", error);
    return getDefaultData();
  }
}

function saveData(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// =====================================================
// ENV-CHECK
// =====================================================

function checkEnv() {
  const requiredEnv = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID"];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);

  if (missingEnv.length > 0) {
    console.error("❌ Fehlende Railway/.env Variablen:", missingEnv.join(", "));
    process.exit(1);
  }

  console.log("✅ Alle wichtigen Variablen wurden gefunden.");
}

// =====================================================
// CLIENT
// =====================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// =====================================================
// ALLGEMEINE HILFSFUNKTIONEN
// =====================================================

function cleanName(input) {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getGermanDateTime() {
  return new Date().toLocaleString("de-DE", {
    timeZone: CONFIG.timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatGermanDateTimeFromMs(ms) {
  return new Date(ms).toLocaleString("de-DE", {
    timeZone: CONFIG.timezone,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getReadableUserName(member, user) {
  if (member?.displayName && !member.displayName.startsWith("<@")) {
    return member.displayName;
  }

  if (user?.globalName) return user.globalName;
  if (user?.username) return user.username;
  if (user?.tag) return user.tag;

  return "Unbekannter User";
}

function getBerlinParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("de-DE", {
    timeZone: CONFIG.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;

  const day = get("day");
  const month = get("month");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");
  const weekday = get("weekday");

  return {
    day,
    month,
    year,
    hour,
    minute,
    weekday,
    dateKey: `${year}-${month}-${day}`,
    dateText: `${day}.${month}.${year}`,
  };
}

function parseGermanDateKey(input) {
  const match = String(input || "").trim().match(/^(\d{1,2})[.](\d{1,2})[.](\d{4})$/);
  if (!match) return null;

  const day = String(Number(match[1])).padStart(2, "0");
  const month = String(Number(match[2])).padStart(2, "0");
  const year = match[3];

  const date = new Date(`${year}-${month}-${day}T12:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function shouldDeleteAbsence(absence, nowDateKey = getBerlinParts().dateKey) {
  if (!absence?.untilDateKey) return false;

  // Einen Tag nach dem Bis-Datum löschen:
  // Beispiel: Bis 20.06.2026 -> ab 21.06.2026 wird gelöscht.
  return nowDateKey > absence.untilDateKey;
}

function formatMoney(amount) {
  return `${Number(amount || 0).toLocaleString("de-DE")}$`;
}

function chunkText(text, maxLength = 1000) {
  if (!text || text.length <= maxLength) return [text || "—"];

  const lines = text.split("\n");
  const chunks = [];
  let current = "";

  for (const line of lines) {
    if ((current + "\n" + line).length > maxLength) {
      chunks.push(current || "—");
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks : ["—"];
}

function unixTimestamp(ms) {
  return Math.floor(ms / 1000);
}

function createShortId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function truncate(text, max = 90) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function hasLeaderPermission(member) {
  if (!member || !member.roles || !member.roles.cache) return false;
  return CONFIG.leaderRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

function hasFootballCreatorPermission(member) {
  if (!member || !member.roles || !member.roles.cache) return false;
  return CONFIG.footballCreatorRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

function getMemberName(member, userId) {
  if (member?.displayName) return member.displayName;
  return `<@${userId}>`;
}

async function sendToChannel(channelId, payload) {
  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel) {
    console.error(`❌ Channel nicht gefunden: ${channelId}`);
    return null;
  }

  return await channel.send(payload);
}


// =====================================================
// ZAHLENDE/R ROLLEN-AUTOMATIK
// =====================================================

function isPayerExcludedUser(userId) {
  return CONFIG.payerExcludedUserIds.includes(userId);
}

function hasAnyRole(member, roleIds) {
  if (!member || !member.roles || !member.roles.cache) return false;
  return roleIds.some((roleId) => member.roles.cache.has(roleId));
}

function shouldHavePayerRole(member) {
  if (!member || !member.user) return false;

  const userId = member.user.id;

  if (member.user.bot) return false;
  if (isPayerExcludedUser(userId)) return false;
  if (!member.roles.cache.has(CONFIG.familyMemberRoleId)) return false;
  if (hasAnyRole(member, CONFIG.payerExemptRoleIds)) return false;

  return true;
}

async function syncPayerRole(member, reason = "Rollenautomatik") {
  try {
    if (!member || member.user?.bot) return;

    const shouldHave = shouldHavePayerRole(member);
    const hasPayerRole = member.roles.cache.has(CONFIG.payerRoleId);

    if (shouldHave && !hasPayerRole) {
      await member.roles.add(CONFIG.payerRoleId, reason);
      console.log(`✅ Zahlende/r-Rolle vergeben an ${member.user.tag}`);
      return;
    }

    if (!shouldHave && hasPayerRole) {
      await member.roles.remove(CONFIG.payerRoleId, reason);
      console.log(`✅ Zahlende/r-Rolle entfernt bei ${member.user.tag}`);
    }
  } catch (error) {
    console.error(`❌ Fehler bei Zahlende/r-Rollenautomatik für ${member?.user?.tag || "unbekannt"}:`, error);
  }
}

async function syncAllPayerRoles(reason = "Bot-Start - Zahlende/r Prüfung") {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);

    if (!guild) {
      console.error("❌ Guild für Zahlende/r-Sync nicht gefunden.");
      return;
    }

    const members = await guild.members.fetch();

    let checked = 0;

    for (const member of members.values()) {
      if (member.user.bot) continue;

      const hasFamilyRole = member.roles.cache.has(CONFIG.familyMemberRoleId);
      const hasPayerRole = member.roles.cache.has(CONFIG.payerRoleId);
      const isExcluded = isPayerExcludedUser(member.user.id);
      const isExempt = hasAnyRole(member, CONFIG.payerExemptRoleIds);

      // Nur relevante Mitglieder prüfen:
      // - Familienmitglieder
      // - oder User, die Zahlende/r bereits haben, damit sie ggf. entfernt wird
      if (!hasFamilyRole && !hasPayerRole) continue;

      checked++;
      await syncPayerRole(member, reason);
    }

    console.log(`✅ Zahlende/r-Sync abgeschlossen. Geprüfte Mitglieder: ${checked}`);
  } catch (error) {
    console.error("❌ Fehler bei syncAllPayerRoles:", error);
  }
}

// =====================================================
// REGISTRIERUNG
// =====================================================

async function addRegisteredRoles(member) {
  const addedRoles = [];
  const failedRoles = [];

  // Zahlende/r wird nicht direkt in der Schleife vergeben,
  // sondern danach über syncPayerRole sauber geprüft.
  const rolesToAdd = CONFIG.registeredRoleIds.filter((roleId) => roleId !== CONFIG.payerRoleId);

  for (const roleId of rolesToAdd) {
    try {
      const role = await member.guild.roles.fetch(roleId).catch(() => null);

      if (!role) {
        failedRoles.push(roleId);
        console.error(`❌ Rolle nicht gefunden: ${roleId}`);
        continue;
      }

      await member.roles.add(role, "SMV Registrierung");
      addedRoles.push(role.name);
    } catch (error) {
      failedRoles.push(roleId);
      console.error(`❌ Rolle konnte nicht vergeben werden (${roleId}):`, error);
    }
  }

  // Member frisch laden, damit Discords Rollen-Cache nach der Registrierung sicher aktuell ist.
  const freshMember = await member.guild.members.fetch(member.id).catch(() => member);

  await syncPayerRole(freshMember, "SMV Registrierung - Zahlende/r Prüfung");

  return { addedRoles, failedRoles };
}

function createRegisterPanelEmbed() {
  return new EmbedBuilder()
    .setColor(CONFIG.embedColor)
    .setTitle("👤 • REGISTRIERUNGSPANEL")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━━━",
        `Privet, willkommen bei der Familie **${CONFIG.familyName}**.`,
        "",
        "**📝 Registrierung**",
        "└ Drücke unten auf den Button und trage deinen **Vor- und Nachnamen** ein.",
        "",
        "━━━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setFooter({
      text: `${CONFIG.shortName} • Registrierung • ${getGermanDateTime()}`,
    });
}

function createRegisterButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("smv_register_button")
      .setLabel("Registrieren")
      .setEmoji("👤")
      .setStyle(ButtonStyle.Primary)
  );
}

function createRegisterModal() {
  const modal = new ModalBuilder()
    .setCustomId("smv_register_modal")
    .setTitle("SMV Registrierung");

  const firstNameInput = new TextInputBuilder()
    .setCustomId("first_name")
    .setLabel("Vorname")
    .setPlaceholder("z. B. Alex")
    .setStyle(TextInputStyle.Short)
    .setMinLength(2)
    .setMaxLength(20)
    .setRequired(true);

  const lastNameInput = new TextInputBuilder()
    .setCustomId("last_name")
    .setLabel("Nachname")
    .setPlaceholder("z. B. Kingsley")
    .setStyle(TextInputStyle.Short)
    .setMinLength(2)
    .setMaxLength(25)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(firstNameInput),
    new ActionRowBuilder().addComponents(lastNameInput)
  );

  return modal;
}

// =====================================================
// AUFSTELLUNG
// =====================================================

function isLineupDay(weekday) {
  return [
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag",
  ].includes(weekday);
}

function getLineupTitle(weekday) {
  return weekday === "Sonntag" ? "Pflichtaufstellung" : "Tagesaufstellung";
}

function getLineupHeadline(lineup) {
  const title = lineup.title || getLineupTitle(lineup.weekday);
  return `# 🐻 SMV ${String(title).toUpperCase()}`;
}

function getLineupStartText(lineup) {
  return lineup.startTimeText || CONFIG.lineupStartTimeText;
}

function parseLineupStartMinutes(startText) {
  const match = String(startText || "").match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return 20 * 60 + 30;

  const hours = Math.min(Math.max(Number(match[1]) || 0, 0), 23);
  const minutes = Math.min(Math.max(Number(match[2]) || 0, 0), 59);

  return hours * 60 + minutes;
}

function getCurrentBerlinMinutes() {
  const now = getBerlinParts();
  return Number(now.hour) * 60 + Number(now.minute);
}

function hasLineupStartPassed(lineup) {
  const now = getBerlinParts();

  if (now.dateKey > lineup.dateKey) return true;
  if (now.dateKey < lineup.dateKey) return false;

  return getCurrentBerlinMinutes() >= parseLineupStartMinutes(getLineupStartText(lineup));
}

function getLineupStatus(lineup) {
  if (lineup.cancelled) return "Aufstellung abgesagt";
  if (lineup.closed || hasLineupStartPassed(lineup)) return "Anmeldung geschlossen";
  return "Anmeldung offen";
}

function isLineupInteractionClosed(lineup) {
  return Boolean(lineup.cancelled || lineup.closed || hasLineupStartPassed(lineup));
}

function createEmptyLineup(dateKey, dateText, weekday, createdBy = null) {
  return {
    dateKey,
    dateText,
    weekday,
    title: getLineupTitle(weekday),
    startTimeText: CONFIG.lineupStartTimeText,
    createdBy,
    createdAt: Date.now(),
    closed: false,
    cancelled: false,
    cancelledBy: null,
    cancelledAt: null,
    lastTimeChangeBy: null,
    lastTimeChangeAt: null,
    messageId: null,
    users: {},
  };
}

function getUsersByStatus(lineup, status) {
  return Object.entries(lineup.users || {})
    .filter(([, userData]) => userData.status === status)
    .map(([userId, userData]) => ({
      userId,
      name: userData.name || `<@${userId}>`,
    }));
}

function formatLineupUserList(users) {
  if (users.length === 0) return "—";

  return users
    .map((user) => `╰ ${user.name}`)
    .join("\n")
    .slice(0, 1000);
}

function createLineupEmbed(lineup) {
  const presentUsers = getUsersByStatus(lineup, "present");
  const absentUsers = getUsersByStatus(lineup, "absent");
  const total = presentUsers.length + absentUsers.length;
  const statusText = getLineupStatus(lineup);

  return new EmbedBuilder()
    .setColor(lineup.cancelled ? CONFIG.dangerColor : statusText === "Anmeldung geschlossen" ? CONFIG.warningColor : CONFIG.embedColor)
    .setTitle(lineup.title || getLineupTitle(lineup.weekday))
    .setDescription(
      [
        "**Event Info:**",
        `📅 **Datum:** ${lineup.dateText}`,
        `🕘 **Beginn:** ${getLineupStartText(lineup)}`,
        "",
        "**Deskription:**",
        "✅ Ihr schafft es pünktlich zur Aufstellung zu kommen.",
        "❌ Ihr schafft es nicht zur Aufstellung zu kommen.",
      ].join("\n")
    )
    .addFields(
      {
        name: `✅ Anwesend (${presentUsers.length})`,
        value: formatLineupUserList(presentUsers),
        inline: true,
      },
      {
        name: `❌ Abwesend (${absentUsers.length})`,
        value: formatLineupUserList(absentUsers),
        inline: true,
      },
      {
        name: "Info",
        value: [
          `Status: **${statusText}**`,
          `Anmeldungen: **${total}**`,
        ].join("\n"),
        inline: false,
      }
    )
    .setFooter({
      text: `${CONFIG.shortName} • Aufstellung • ${lineup.dateText}`,
    });
}

function createLineupButtons(lineup) {
  const presentUsers = getUsersByStatus(lineup, "present");
  const absentUsers = getUsersByStatus(lineup, "absent");
  const closed = isLineupInteractionClosed(lineup);

  const participationRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lineup_present_${lineup.dateKey}`)
      .setLabel(`${presentUsers.length}`)
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(closed),

    new ButtonBuilder()
      .setCustomId(`lineup_absent_${lineup.dateKey}`)
      .setLabel(`${absentUsers.length}`)
      .setEmoji("❌")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(closed)
  );

  const managementRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lineup_cancel_${lineup.dateKey}`)
      .setLabel("Aufstellung absagen")
      .setEmoji("🛑")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(Boolean(lineup.cancelled)),

    new ButtonBuilder()
      .setCustomId(`lineup_reopen_${lineup.dateKey}`)
      .setLabel("Aufstellung wieder öffnen")
      .setEmoji("🔓")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!lineup.cancelled),

    new ButtonBuilder()
      .setCustomId(`lineup_time_${lineup.dateKey}`)
      .setLabel("Aufstellungsuhrzeit ändern")
      .setEmoji("🕘")
      .setStyle(ButtonStyle.Secondary)
  );

  return [participationRow, managementRow];
}

function createLineupTimeModal(dateKey) {
  const modal = new ModalBuilder()
    .setCustomId(`lineup_time_modal_${dateKey}`)
    .setTitle("🕘 Aufstellungsuhrzeit ändern");

  const timeInput = new TextInputBuilder()
    .setCustomId("lineup_new_time")
    .setLabel("Neue Uhrzeit")
    .setPlaceholder("z. B. 21:00 Uhr")
    .setStyle(TextInputStyle.Short)
    .setMinLength(4)
    .setMaxLength(30)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(timeInput));

  return modal;
}

function normalizeLineupTimeText(input) {
  const value = String(input || "").trim();
  if (!value) return CONFIG.lineupStartTimeText;
  if (/uhr/i.test(value)) return value;
  return `${value} Uhr`;
}

async function updateLineupMessage(lineup) {
  if (!lineup.messageId) return;

  const channel = await client.channels.fetch(CONFIG.lineupChannelId).catch(() => null);
  if (!channel) {
    console.error("❌ Aufstellungs-Channel nicht gefunden.");
    return;
  }

  const message = await channel.messages.fetch(lineup.messageId).catch(() => null);
  if (!message) {
    console.error("❌ Aufstellungsnachricht nicht gefunden.");
    return;
  }

  await message.edit({
    embeds: [createLineupEmbed(lineup)],
    components: createLineupButtons(lineup),
  });
}

async function announceLineupCancelled(lineup, leaderId) {
  await sendToChannel(CONFIG.lineupChannelId, {
    content: [
      `<@&${CONFIG.lineupMentionRoleId}>`,
      "",
      "🐻 **SMV AUFSTELLUNG ABGESAGT**",
      "",
      "Die heutige Aufstellung wurde von der Leaderschaft abgesagt.",
      "",
      `📅 **Datum:** ${lineup.dateText}`,
      `🕘 **Ursprüngliche Uhrzeit:** ${getLineupStartText(lineup)}`,
      `👑 **Abgesagt von:** <@${leaderId}>`,
    ].join("\n"),
    allowedMentions: { roles: [CONFIG.lineupMentionRoleId], users: [leaderId] },
  });
}

async function announceLineupReopened(lineup, leaderId) {
  await sendToChannel(CONFIG.lineupChannelId, {
    content: [
      `<@&${CONFIG.lineupMentionRoleId}>`,
      "",
      "🔓 **SMV AUFSTELLUNG WIEDER GEÖFFNET**",
      "",
      "Die heutige Aufstellung wurde wieder geöffnet.",
      "",
      `📅 **Datum:** ${lineup.dateText}`,
      `🕘 **Beginn:** ${getLineupStartText(lineup)}`,
      `👑 **Geöffnet von:** <@${leaderId}>`,
      "",
      "Ihr könnt euch jetzt wieder anmelden.",
    ].join("\n"),
    allowedMentions: { roles: [CONFIG.lineupMentionRoleId], users: [leaderId] },
  });
}

async function announceLineupTimeChanged(lineup, oldTime, newTime, leaderId) {
  await sendToChannel(CONFIG.lineupChannelId, {
    content: [
      `<@&${CONFIG.lineupMentionRoleId}>`,
      "",
      "🕘 **AUFSTELLUNGSUHRZEIT GEÄNDERT**",
      "",
      "Die heutige Aufstellung wurde verschoben.",
      "",
      `Alte Uhrzeit: **${oldTime}**`,
      `Neue Uhrzeit: **${newTime}**`,
      "",
      "Bitte beachtet die neue Uhrzeit.",
      `Uhrzeit geändert von: <@${leaderId}>`,
    ].join("\n"),
    allowedMentions: { roles: [CONFIG.lineupMentionRoleId], users: [leaderId] },
  });
}

async function cancelLineup(interaction, dateKey) {
  if (!hasLeaderPermission(interaction.member)) {
    return interaction.reply({
      content: "❌ Du hast keine Berechtigung, die Aufstellung abzusagen.",
      ephemeral: true,
    });
  }

  const data = loadData();
  const lineup = data.lineups[dateKey];

  if (!lineup) {
    return interaction.reply({
      content: "❌ Diese Aufstellung wurde nicht im Speicher gefunden.",
      ephemeral: true,
    });
  }

  if (lineup.cancelled) {
    return interaction.reply({
      content: "ℹ️ Diese Aufstellung wurde bereits abgesagt.",
      ephemeral: true,
    });
  }

  lineup.cancelled = true;
  lineup.closed = true;
  lineup.cancelledBy = interaction.user.id;
  lineup.cancelledAt = Date.now();

  data.lineups[dateKey] = lineup;
  saveData(data);

  await updateLineupMessage(lineup);
  await announceLineupCancelled(lineup, interaction.user.id);

  return interaction.reply({
    content: "✅ Aufstellung wurde abgesagt und die SMV-Rolle wurde informiert.",
    ephemeral: true,
  });
}

async function reopenLineup(interaction, dateKey) {
  if (!hasLeaderPermission(interaction.member)) {
    return interaction.reply({
      content: "❌ Du hast keine Berechtigung, die Aufstellung wieder zu öffnen.",
      ephemeral: true,
    });
  }

  const data = loadData();
  const lineup = data.lineups[dateKey];

  if (!lineup) {
    return interaction.reply({
      content: "❌ Diese Aufstellung wurde nicht im Speicher gefunden.",
      ephemeral: true,
    });
  }

  if (!lineup.cancelled) {
    return interaction.reply({
      content: "ℹ️ Diese Aufstellung ist bereits geöffnet.",
      ephemeral: true,
    });
  }

  lineup.cancelled = false;
  lineup.cancelledBy = null;
  lineup.cancelledAt = null;
  lineup.closed = false;
  lineup.reopenedBy = interaction.user.id;
  lineup.reopenedAt = Date.now();

  data.lineups[dateKey] = lineup;
  saveData(data);

  await updateLineupMessage(lineup);
  await announceLineupReopened(lineup, interaction.user.id);

  return interaction.reply({
    content: "✅ Aufstellung wurde wieder geöffnet und die SMV-Rolle wurde informiert.",
    ephemeral: true,
  });
}

async function changeLineupTime(interaction, dateKey) {
  if (!hasLeaderPermission(interaction.member)) {
    return interaction.reply({
      content: "❌ Du hast keine Berechtigung, die Aufstellungsuhrzeit zu ändern.",
      ephemeral: true,
    });
  }

  const data = loadData();
  const lineup = data.lineups[dateKey];

  if (!lineup) {
    return interaction.reply({
      content: "❌ Diese Aufstellung wurde nicht im Speicher gefunden.",
      ephemeral: true,
    });
  }

  const oldTime = getLineupStartText(lineup);
  const newTime = normalizeLineupTimeText(interaction.fields.getTextInputValue("lineup_new_time"));

  lineup.startTimeText = newTime;
  lineup.lastTimeChangeBy = interaction.user.id;
  lineup.lastTimeChangeAt = Date.now();

  // Wenn die neue Uhrzeit noch nicht erreicht ist, wird die Anmeldung wieder geöffnet.
  lineup.closed = hasLineupStartPassed(lineup);

  data.lineups[dateKey] = lineup;
  saveData(data);

  await updateLineupMessage(lineup);
  await announceLineupTimeChanged(lineup, oldTime, newTime, interaction.user.id);

  return interaction.reply({
    content: `✅ Aufstellungsuhrzeit wurde von **${oldTime}** auf **${newTime}** geändert und die SMV-Rolle wurde informiert.`,
    ephemeral: true,
  });
}

async function findExistingLineupMessageForDate(dateText) {
  const channel = await client.channels.fetch(CONFIG.lineupChannelId).catch(() => null);
  if (!channel || !channel.messages) return null;

  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!messages) return null;

  for (const message of messages.values()) {
    if (message.author?.id !== client.user.id) continue;

    const hasTodayLineupEmbed = message.embeds?.some((embed) => {
      const title = embed.title || "";
      const description = embed.description || "";
      const footer = embed.footer?.text || "";

      return (
        title.toLowerCase().includes("aufstellung") &&
        (
          description.includes(`📅 **Datum:** ${dateText}`) ||
          footer.includes(`Aufstellung • ${dateText}`) ||
          footer.includes(dateText)
        )
      );
    });

    if (hasTodayLineupEmbed) return message;
  }

  return null;
}

async function findLineupMessageById(messageId) {
  if (!messageId) return null;

  const channel = await client.channels.fetch(CONFIG.lineupChannelId).catch(() => null);
  if (!channel || !channel.messages) return null;

  return channel.messages.fetch(messageId).catch(() => null);
}

async function forcePostLineupForToday(reason = "manual-force") {
  const now = getBerlinParts();

  if (!isLineupDay(now.weekday)) {
    console.log(`ℹ️ Heute ist ${now.weekday}. Keine Aufstellung.`);
    return {
      ok: false,
      message: `Heute ist **${now.weekday}**. Heute ist kein Aufstellungstag.`,
    };
  }

  const data = loadData();

  const lineup =
    data.lineups?.[now.dateKey] ||
    createEmptyLineup(now.dateKey, now.dateText, now.weekday, client.user.id);

  lineup.dateKey = now.dateKey;
  lineup.dateText = now.dateText;
  lineup.weekday = now.weekday;
  lineup.title = getLineupTitle(now.weekday);
  lineup.closed = false;
  lineup.cancelled = false;
  lineup.cancelledBy = null;
  lineup.cancelledAt = null;
  lineup.messageId = null;

  const message = await sendToChannel(CONFIG.lineupChannelId, {
    content: `<@&${CONFIG.lineupMentionRoleId}>`,
    embeds: [createLineupEmbed(lineup)],
    components: createLineupButtons(lineup),
    allowedMentions: { roles: [CONFIG.lineupMentionRoleId] },
  });

  if (!message) {
    console.error("❌ Aufstellung konnte nicht manuell erzwungen werden.");
    return {
      ok: false,
      message: "Die Aufstellung konnte nicht gesendet werden. Bitte prüfe Channel-ID und Bot-Rechte.",
    };
  }

  lineup.messageId = message.id;

  data.postedDates[now.dateKey] = {
    messageId: message.id,
    createdAt: new Date().toISOString(),
    reason,
  };

  data.lineups[now.dateKey] = lineup;
  saveData(data);

  console.log(`✅ ${lineup.title} für ${now.dateText} wurde manuell erzwungen. Grund: ${reason}`);

  return {
    ok: true,
    message: `${lineup.title} für **${now.dateText}** wurde neu gepostet.`,
  };
}

async function createLineupForToday(reason = "scheduled") {
  const now = getBerlinParts();

  if (!isLineupDay(now.weekday)) {
    console.log(`ℹ️ Heute ist ${now.weekday}. Keine Aufstellung.`);
    return;
  }

  const data = loadData();

  if (data.postedDates[now.dateKey]) {
    const savedMessage = await findLineupMessageById(data.postedDates[now.dateKey].messageId);

    if (savedMessage) {
      console.log(`ℹ️ Aufstellung für ${now.dateKey} wurde bereits erstellt und die Nachricht existiert noch.`);
      return;
    }

    console.log(`⚠️ Aufstellung für ${now.dateKey} war gespeichert, aber die Discord-Nachricht fehlt. Ich erstelle sie neu.`);
    delete data.postedDates[now.dateKey];

    if (data.lineups?.[now.dateKey]) {
      data.lineups[now.dateKey].messageId = null;
      data.lineups[now.dateKey].closed = false;
      data.lineups[now.dateKey].cancelled = false;
    }

    saveData(data);
  }

  const existingMessage = await findExistingLineupMessageForDate(now.dateText);

  if (existingMessage) {
    const existingLineup = data.lineups?.[now.dateKey] || createEmptyLineup(now.dateKey, now.dateText, now.weekday, client.user.id);
    existingLineup.messageId = existingMessage.id;

    data.postedDates[now.dateKey] = {
      messageId: existingMessage.id,
      createdAt: new Date().toISOString(),
      reason: "existing-message-found",
    };

    data.lineups[now.dateKey] = existingLineup;
    saveData(data);

    console.log(`ℹ️ Es existiert bereits eine Aufstellung für ${now.dateText}. Keine neue Nachricht erstellt.`);
    return;
  }

  const lineup = createEmptyLineup(now.dateKey, now.dateText, now.weekday, client.user.id);

  const message = await sendToChannel(CONFIG.lineupChannelId, {
    content: `<@&${CONFIG.lineupMentionRoleId}>`,
    embeds: [createLineupEmbed(lineup)],
    components: createLineupButtons(lineup),
    allowedMentions: { roles: [CONFIG.lineupMentionRoleId] },
  });

  if (!message) {
    console.error("❌ Aufstellung konnte nicht gesendet werden.");
    return;
  }

  lineup.messageId = message.id;

  data.postedDates[now.dateKey] = {
    messageId: message.id,
    createdAt: new Date().toISOString(),
    reason,
  };

  data.lineups[now.dateKey] = lineup;
  saveData(data);

  console.log(`✅ ${lineup.title} für ${now.dateText} wurde erstellt. Grund: ${reason}`);
}

async function checkDailyLineup() {
  const now = getBerlinParts();

  if (!isLineupDay(now.weekday)) return;

  await createLineupForToday("auto-check");
}

async function checkLineupClosures() {
  const data = loadData();
  let changed = false;

  for (const [dateKey, lineup] of Object.entries(data.lineups || {})) {
    if (!lineup || lineup.cancelled || lineup.closed) continue;

    if (hasLineupStartPassed(lineup)) {
      lineup.closed = true;
      data.lineups[dateKey] = lineup;
      changed = true;
      await updateLineupMessage(lineup);
      console.log(`✅ Aufstellung für ${lineup.dateText} wurde automatisch geschlossen.`);
    }
  }

  if (changed) saveData(data);
}

// =====================================================
// SANKTIONEN / LEADERPANEL
// =====================================================

function createLeaderPanelEmbed() {
  return new EmbedBuilder()
    .setColor(CONFIG.embedColor)
    .setTitle("👑 • SMV LEADERPANEL")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━━━",
        `Leaderbereich der Familie **${CONFIG.familyName}**.`,
        "",
        "**⚠️ Sanktionen**",
        "└ User auswählen, eine oder mehrere Sanktionen vergeben und automatisch berechnen lassen.",
        "",
        "**💸 Wochenabgabe**",
        "└ Wochenabgabe für 1 bis 6 Wochen aussetzen oder aktive Aussetzungen anzeigen.",
        "",
        "━━━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setFooter({
      text: `${CONFIG.shortName} • Leaderverwaltung • ${getGermanDateTime()}`,
    });
}

function createLeaderPanelButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("leader_create_sanction")
      .setLabel("Sanktion erstellen")
      .setEmoji("⚠️")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("leader_weekly_manage")
      .setLabel("WA verwalten")
      .setEmoji("💸")
      .setStyle(ButtonStyle.Primary)
  );
}

function createSanctionDraft(leaderId) {
  const draft = {
    leaderId,
    targetUserId: null,
    selectedByMenu: {
      group1: [],
      group2: [],
      group3: [],
    },
    createdAt: Date.now(),
  };

  sanctionDrafts.set(leaderId, draft);
  return draft;
}

function getSanctionDraft(leaderId) {
  return sanctionDrafts.get(leaderId) || createSanctionDraft(leaderId);
}

function getDraftSelectedIds(draft) {
  return [
    ...(draft.selectedByMenu.group1 || []),
    ...(draft.selectedByMenu.group2 || []),
    ...(draft.selectedByMenu.group3 || []),
  ].filter((value, index, array) => array.indexOf(value) === index);
}

function createSanctionOptions(startSection, endSection) {
  return SANCTIONS
    .filter((s) => {
      const number = Number(s.section.replace("§", ""));
      return number >= startSection && number <= endSection;
    })
    .map((s) => ({
      label: truncate(`${s.section} ${s.label}`, 100),
      description: truncate(s.special ? `${s.special}${s.amount ? ` + ${formatMoney(s.amount)}` : ""}` : formatMoney(s.amount), 100),
      value: s.id,
    }));
}

function createSanctionBuilderComponents(leaderId) {
  const draft = getSanctionDraft(leaderId);

  const rowUser = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId("sanction_user_select")
      .setPlaceholder("User auswählen")
      .setMinValues(1)
      .setMaxValues(1)
  );

  const rowGroup1 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("sanction_select_group1")
      .setPlaceholder("Sanktionen auswählen: §12 - §29")
      .setMinValues(0)
      .setMaxValues(createSanctionOptions(12, 29).length)
      .addOptions(createSanctionOptions(12, 29))
  );

  const rowGroup2 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("sanction_select_group2")
      .setPlaceholder("Sanktionen auswählen: §31 - §45")
      .setMinValues(0)
      .setMaxValues(createSanctionOptions(31, 45).length)
      .addOptions(createSanctionOptions(31, 45))
  );

  const rowGroup3 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("sanction_select_group3")
      .setPlaceholder("Sanktionen auswählen: §46 - §60")
      .setMinValues(0)
      .setMaxValues(createSanctionOptions(46, 60).length)
      .addOptions(createSanctionOptions(46, 60))
  );

  const selectedCount = getDraftSelectedIds(draft).length;

  const rowButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("sanction_submit")
      .setLabel(`Sanktion ausstellen (${selectedCount})`)
      .setEmoji("⚠️")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("sanction_clear")
      .setLabel("Zurücksetzen")
      .setEmoji("🧹")
      .setStyle(ButtonStyle.Secondary)
  );

  return [rowUser, rowGroup1, rowGroup2, rowGroup3, rowButtons];
}

function createSanctionDraftText(leaderId) {
  const draft = getSanctionDraft(leaderId);
  const selectedIds = getDraftSelectedIds(draft);
  const selectedSanctions = selectedIds.map((id) => SANCTION_MAP.get(id)).filter(Boolean);

  const targetText = draft.targetUserId ? `<@${draft.targetUserId}>` : "Noch kein User ausgewählt";

  const sanctionsText = selectedSanctions.length
    ? selectedSanctions.map((s) => `• **${s.section}** ${s.label}`).join("\n")
    : "Noch keine Sanktion ausgewählt";

  return [
    "**⚠️ Sanktion erstellen**",
    "",
    `**Name:** ${targetText}`,
    "",
    "**Ausgewählte Sanktionen:**",
    sanctionsText,
    "",
    "Wähle zuerst den User und danach eine oder mehrere Sanktionen aus.",
    "Am Ende auf **Sanktion ausstellen** drücken.",
  ].join("\n");
}

function calculateSanctionTotals(selectedSanctions) {
  const total = selectedSanctions.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const specials = selectedSanctions
    .filter((s) => s.special)
    .map((s) => `${s.section}: ${s.special}`);

  return { total, specials };
}

function formatSanctionList(selectedSanctions) {
  return selectedSanctions
    .map((s) => {
      const punishment = s.special && s.amount
        ? `${s.special} + ${formatMoney(s.amount)}`
        : s.special
          ? s.special
          : formatMoney(s.amount);

      return `**${s.section}** ${s.label}\n└ ${punishment}`;
    })
    .join("\n\n")
    .slice(0, 3900);
}

function createSanctionRecord({ targetUserId, leaderId, selectedSanctions, guildId }) {
  const createdAt = Date.now();
  const dueAt = createdAt + CONFIG.sanctionDueDays * 24 * 60 * 60 * 1000;
  const { total, specials } = calculateSanctionTotals(selectedSanctions);

  return {
    id: createShortId(),
    guildId,
    targetUserId,
    leaderId,
    sanctionIds: selectedSanctions.map((s) => s.id),
    total,
    specials,
    createdAt,
    dueAt,
    paid: false,
    paidAt: null,
    paidBy: null,
    cancelled: false,
    cancelledAt: null,
    cancelledBy: null,
    warnedOverdue: false,
    messageId: null,
  };
}

function createSanctionEmbed(record) {
  const selectedSanctions = record.sanctionIds
    .map((id) => SANCTION_MAP.get(id))
    .filter(Boolean);

  const dueUnix = unixTimestamp(record.dueAt);
  const createdUnix = unixTimestamp(record.createdAt);

  const moneyText = record.total > 0 ? formatMoney(record.total) : "Keine feste Geldsumme";
  const specialText = record.specials && record.specials.length > 0
    ? record.specials.join("\n")
    : "Keine";

  const statusText = record.cancelled
    ? `❌ Storniert von <@${record.cancelledBy}> am <t:${unixTimestamp(record.cancelledAt)}:F>`
    : record.paid
      ? `✅ Bezahlt von <@${record.paidBy}> am <t:${unixTimestamp(record.paidAt)}:F>`
      : Date.now() >= record.dueAt
        ? "⚠️ Überfällig"
        : "⏳ Offen";

  const embedColor = record.cancelled
    ? CONFIG.dangerColor
    : record.paid
      ? CONFIG.successColor
      : Date.now() >= record.dueAt
        ? CONFIG.dangerColor
        : CONFIG.warningColor;

  return new EmbedBuilder()
    .setColor(embedColor)
    .setTitle("🚫 SANKTION 🚫")
    .addFields(
      {
        name: "Name",
        value: `<@${record.targetUserId}>`,
        inline: false,
      },
      {
        name: "Sanktion",
        value: formatSanctionList(selectedSanctions) || "Keine Sanktion gefunden",
        inline: false,
      },
      {
        name: "Zu Bezahlen",
        value: moneyText,
        inline: true,
      },
      {
        name: "Sonderstrafe",
        value: specialText,
        inline: true,
      },
      {
        name: "Zeitraum",
        value: [
          `Erstellt: <t:${createdUnix}:F>`,
          `Frist: <t:${dueUnix}:F>`,
          `Restzeit: <t:${dueUnix}:R>`,
        ].join("\n"),
        inline: false,
      },
      {
        name: "Ausgestellt von",
        value: `<@${record.leaderId}>`,
        inline: true,
      },
      {
        name: "Status",
        value: statusText,
        inline: true,
      }
    )
    .setFooter({
      text: `${CONFIG.shortName} • Sanktion-ID: ${record.id}`,
    });
}

function createSanctionButtons(record) {
  const isClosed = Boolean(record.paid || record.cancelled);

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sanction_paid_${record.id}`)
      .setLabel(record.paid ? "Bereits bezahlt" : "Bezahlt markieren")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(isClosed),

    new ButtonBuilder()
      .setCustomId(`sanction_cancel_${record.id}`)
      .setLabel(record.cancelled ? "Storniert" : "Stornieren")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(isClosed)
  );
}

async function updateSanctionMessage(record) {
  if (!record.messageId) return;

  const channel = await client.channels.fetch(CONFIG.sanctionChannelId).catch(() => null);
  if (!channel) return;

  const message = await channel.messages.fetch(record.messageId).catch(() => null);
  if (!message) return;

  await message.edit({
    embeds: [createSanctionEmbed(record)],
    components: [createSanctionButtons(record)],
  });
}

async function createAndPostSanction(interaction, draft) {
  const selectedIds = getDraftSelectedIds(draft);
  const selectedSanctions = selectedIds.map((id) => SANCTION_MAP.get(id)).filter(Boolean);

  if (!draft.targetUserId) {
    return interaction.reply({
      content: "❌ Bitte wähle zuerst einen User aus.",
      ephemeral: true,
    });
  }

  if (selectedSanctions.length === 0) {
    return interaction.reply({
      content: "❌ Bitte wähle mindestens eine Sanktion aus.",
      ephemeral: true,
    });
  }

  const record = createSanctionRecord({
    targetUserId: draft.targetUserId,
    leaderId: interaction.user.id,
    selectedSanctions,
    guildId: interaction.guildId,
  });

  const message = await sendToChannel(CONFIG.sanctionChannelId, {
    embeds: [createSanctionEmbed(record)],
    components: [createSanctionButtons(record)],
  });

  if (!message) {
    return interaction.reply({
      content: "❌ Der Sanktionschannel wurde nicht gefunden.",
      ephemeral: true,
    });
  }

  record.messageId = message.id;

  const data = loadData();
  data.sanctions[record.id] = record;
  saveData(data);

  sanctionDrafts.delete(interaction.user.id);

  await sendToChannel(CONFIG.sanctionLogChannelId, {
    embeds: [
      new EmbedBuilder()
        .setColor(CONFIG.warningColor)
        .setTitle("🚫 Neue Sanktion erstellt")
        .setDescription(
          [
            "━━━━━━━━━━━━━━━━━━━━",
            `**Name:** <@${record.targetUserId}>`,
            `**Zu Bezahlen:** ${record.total > 0 ? `**${formatMoney(record.total)}**` : "**Keine feste Geldsumme**"}`,
            `**Frist:** <t:${unixTimestamp(record.dueAt)}:F>`,
            `**Restzeit:** <t:${unixTimestamp(record.dueAt)}:R>`,
            `**Ausgestellt von:** <@${record.leaderId}>`,
            `**Sanktion-ID:** \`${record.id}\``,
            "━━━━━━━━━━━━━━━━━━━━",
          ].join("\n")
        )
        .setFooter({ text: `${CONFIG.shortName} • Sanktionslog` }),
    ],
  });

  return interaction.reply({
    content: `✅ Sanktion wurde erfolgreich in <#${CONFIG.sanctionChannelId}> erstellt.`,
    ephemeral: true,
  });
}

async function checkOverdueSanctions() {
  const data = loadData();
  let changed = false;

  for (const record of Object.values(data.sanctions || {})) {
    if (record.paid) continue;
    if (record.cancelled) continue;
    if (record.warnedOverdue) continue;
    if (Date.now() < record.dueAt) continue;

    record.warnedOverdue = true;
    changed = true;

    await sendToChannel(CONFIG.sanctionLogChannelId, {
      embeds: [
        new EmbedBuilder()
          .setColor(CONFIG.dangerColor)
          .setTitle("🚨 Sanktion überfällig")
          .setDescription(
            [
              "━━━━━━━━━━━━━━━━━━━━",
              `**Name:** <@${record.targetUserId}>`,
              `**Zu Bezahlen:** ${record.total > 0 ? `**${formatMoney(record.total)}**` : "**Keine feste Geldsumme**"}`,
              `**Frist war:** <t:${unixTimestamp(record.dueAt)}:F>`,
              `**Überfällig seit:** <t:${unixTimestamp(record.dueAt)}:R>`,
              `**Ausgestellt von:** <@${record.leaderId}>`,
              `**Sanktion-ID:** \`${record.id}\``,
              "━━━━━━━━━━━━━━━━━━━━",
            ].join("\n")
          )
          .setFooter({ text: `${CONFIG.shortName} • Sanktionslog` }),
      ],
    });

    await updateSanctionMessage(record).catch(() => {});
  }

  if (changed) saveData(data);
}



// =====================================================
// FAMILIENPANEL / ABMELDUNG
// =====================================================

function createFamilyPanelEmbed() {
  return new EmbedBuilder()
    .setColor(CONFIG.embedColor)
    .setTitle("🐻 • FAMILIENPANEL")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━━━",
        `Willkommen im Familienbereich der Familie **${CONFIG.familyName}**.`,
        "",
        "**📋 Abmeldung**",
        "└ Melde dich für einen bestimmten Zeitraum ab.",
        "",
        "**⚽ Fußball-Event**",
        "└ Spiel gegen eine andere Familie erstellen und Teilnehmer verwalten.",
        "",
        "**💸 Wochenabgabe**",
        "└ Bestätige deine Wochenabgabe für 1 bis 6 Wochen.",
        "",
        "━━━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setFooter({
      text: `${CONFIG.shortName} • Familienverwaltung • ${getGermanDateTime()}`,
    });
}

function createFamilyPanelButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("family_absence")
      .setLabel("Abmeldung")
      .setEmoji("📋")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("family_create_football")
      .setLabel("Fußball-Event")
      .setEmoji("⚽")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("family_weekly_payment")
      .setLabel("Wochenabgabe bezahlt")
      .setEmoji("💸")
      .setStyle(ButtonStyle.Success)
  );
}

function createAbsenceModal() {
  const modal = new ModalBuilder()
    .setCustomId("absence_modal")
    .setTitle("📋 Abmeldung erstellen");

  const nameInput = new TextInputBuilder()
    .setCustomId("absence_name")
    .setLabel("Name")
    .setPlaceholder("z. B. SMV I Alex Kingsley")
    .setStyle(TextInputStyle.Short)
    .setMinLength(2)
    .setMaxLength(60)
    .setRequired(true);

  const fromInput = new TextInputBuilder()
    .setCustomId("absence_from")
    .setLabel("Von")
    .setPlaceholder("TT.MM.JJJJ")
    .setStyle(TextInputStyle.Short)
    .setMinLength(8)
    .setMaxLength(20)
    .setRequired(true);

  const untilInput = new TextInputBuilder()
    .setCustomId("absence_until")
    .setLabel("Bis")
    .setPlaceholder("TT.MM.JJJJ")
    .setStyle(TextInputStyle.Short)
    .setMinLength(8)
    .setMaxLength(20)
    .setRequired(true);

  const reasonInput = new TextInputBuilder()
    .setCustomId("absence_reason")
    .setLabel("Grund")
    .setPlaceholder("z. B. Privat, Arbeit, Urlaub, Krankheit ...")
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(2)
    .setMaxLength(800)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(fromInput),
    new ActionRowBuilder().addComponents(untilInput),
    new ActionRowBuilder().addComponents(reasonInput)
  );

  return modal;
}

function createAbsenceEmbed({ name, from, until, reason, userId }) {
  return new EmbedBuilder()
    .setColor(CONFIG.warningColor)
    .setTitle("📋 • ABMELDUNG")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━━━",
        `**${name}** hat eine Abmeldung eingereicht.`,
        "━━━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .addFields(
      {
        name: "👤 Name",
        value: name,
        inline: true,
      },
      {
        name: "📅 Zeitraum",
        value: `**Von:** ${from}\n**Bis:** ${until}`,
        inline: true,
      },
      {
        name: "📝 Grund",
        value: reason,
        inline: false,
      },
      {
        name: "📨 Eingereicht von",
        value: `<@${userId}>`,
        inline: false,
      }
    )
    .setTimestamp()
    .setFooter({
      text: `${CONFIG.shortName} • Abmeldung`,
    });
}

async function postAbsence(interaction) {
  const name = interaction.fields.getTextInputValue("absence_name").trim();
  const from = interaction.fields.getTextInputValue("absence_from").trim();
  const until = interaction.fields.getTextInputValue("absence_until").trim();
  const reason = interaction.fields.getTextInputValue("absence_reason").trim();

  const message = await sendToChannel(CONFIG.absenceChannelId, {
    embeds: [
      createAbsenceEmbed({
        name,
        from,
        until,
        reason,
        userId: interaction.user.id,
      }),
    ],
  });

  if (!message) {
    return interaction.reply({
      content: "❌ Der Abmeldungs-Channel wurde nicht gefunden.",
      ephemeral: true,
    });
  }

  const untilDateKey = parseGermanDateKey(until);

  if (untilDateKey) {
    const data = loadData();

    if (!data.absences) data.absences = {};

    data.absences[message.id] = {
      messageId: message.id,
      channelId: CONFIG.absenceChannelId,
      userId: interaction.user.id,
      name,
      from,
      until,
      untilDateKey,
      createdAt: new Date().toISOString(),
    };

    saveData(data);
  }

  return interaction.reply({
    content: untilDateKey
      ? `✅ Deine Abmeldung wurde erfolgreich in <#${CONFIG.absenceChannelId}> eingereicht. Sie wird automatisch einen Tag nach dem Bis-Datum um 00 Uhr gelöscht.`
      : `✅ Deine Abmeldung wurde erfolgreich in <#${CONFIG.absenceChannelId}> eingereicht. ⚠️ Das Bis-Datum konnte nicht sauber erkannt werden, daher wird diese Abmeldung nicht automatisch gelöscht.`,
    ephemeral: true,
  });
}



// =====================================================
// WOCHENABGABE
// =====================================================

function getWeekKey(date = new Date()) {
  // Stabile Kalenderwochen-Berechnung anhand deutscher Zeit.
  const berlin = getBerlinParts(date);
  const localDate = new Date(`${berlin.year}-${berlin.month}-${berlin.day}T12:00:00Z`);

  // ISO-Woche: Montag = Wochenstart
  const dayNum = localDate.getUTCDay() || 7;
  localDate.setUTCDate(localDate.getUTCDate() + 4 - dayNum);

  const yearStart = new Date(Date.UTC(localDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((localDate - yearStart) / 86400000) + 1) / 7);
  const year = localDate.getUTCFullYear();

  return `${year}-KW${String(weekNo).padStart(2, "0")}`;
}

function getFutureWeekKey(offsetWeeks = 0) {
  const date = new Date(Date.now() + offsetWeeks * 7 * 24 * 60 * 60 * 1000);
  return getWeekKey(date);
}

function getWeekKeysFromNow(count = 1) {
  return Array.from({ length: count }, (_, index) => getFutureWeekKey(index));
}

function formatWeekList(weekKeys) {
  if (!weekKeys || weekKeys.length === 0) return "—";
  return weekKeys.map((weekKey) => `• ${weekKey}`).join("\n");
}

function isWeeklyPaymentPaused(weekKey) {
  const data = loadData();
  return Boolean(data.weeklyPaymentPauses?.[weekKey]);
}

function getWeeklyPaymentPause(weekKey) {
  const data = loadData();
  return data.weeklyPaymentPauses?.[weekKey] || null;
}

function createWeeklyPaymentManageMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("weekly_pause_manage_select")
      .setPlaceholder("Was möchtest du machen?")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        {
          label: "Wochenabgabe aussetzen",
          description: "WA für 1 bis 6 Wochen aussetzen",
          value: "pause",
          emoji: "💸",
        },
        {
          label: "Aktive Aussetzungen ansehen",
          description: "Zeigt aktuell gespeicherte WA-Aussetzungen",
          value: "show",
          emoji: "📋",
        }
      )
  );
}

function createWeeklyPaymentPauseModal() {
  const modal = new ModalBuilder()
    .setCustomId("weekly_pause_modal")
    .setTitle("💸 Wochenabgabe aussetzen");

  const weeksInput = new TextInputBuilder()
    .setCustomId("weekly_pause_weeks")
    .setLabel("Wie viele Wochen?")
    .setPlaceholder("1 bis 6")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(1)
    .setRequired(true);

  const reasonInput = new TextInputBuilder()
    .setCustomId("weekly_pause_reason")
    .setLabel("Grund")
    .setPlaceholder("z. B. Eventwoche, Pause, Absprache ...")
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(2)
    .setMaxLength(300)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(weeksInput),
    new ActionRowBuilder().addComponents(reasonInput)
  );

  return modal;
}

function createWeeklyPaymentPausedEmbed(weekKey, pause) {
  return new EmbedBuilder()
    .setColor(CONFIG.warningColor)
    .setTitle("💸 WOCHENABGABE AUSGESETZT")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━━━",
        `📅 **Woche:** ${weekKey}`,
        "",
        "Diese Woche entfällt die Wochenabgabe.",
        "Es wird keine Bezahlt/Nicht-bezahlt-Liste erstellt.",
        "",
        `👑 **Eingetragen von:** <@${pause.pausedBy}>`,
        `🕘 **Eingetragen am:** ${formatGermanDateTimeFromMs(pause.pausedAt)}`,
        pause.reason ? `📝 **Grund:** ${pause.reason}` : "📝 **Grund:** —",
        "━━━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setFooter({ text: `${CONFIG.shortName} • Wochenabgabe • Ausgesetzt` });
}

async function handleWeeklyPaymentPauseModal(interaction) {
  if (!hasLeaderPermission(interaction.member)) {
    return interaction.reply({
      content: "❌ Du hast keine Berechtigung, die Wochenabgabe auszusetzen.",
      ephemeral: true,
    });
  }

  const weekCountRaw = interaction.fields.getTextInputValue("weekly_pause_weeks");
  const weekCount = Number(weekCountRaw);
  const reason = interaction.fields.getTextInputValue("weekly_pause_reason")?.trim() || "Kein Grund angegeben";

  if (!Number.isInteger(weekCount) || weekCount < 1 || weekCount > 6) {
    return interaction.reply({
      content: "❌ Bitte gib bei Wochen eine Zahl von **1 bis 6** ein.",
      ephemeral: true,
    });
  }

  const weekKeys = getWeekKeysFromNow(weekCount);
  const data = loadData();

  if (!data.weeklyPaymentPauses) data.weeklyPaymentPauses = {};

  for (const weekKey of weekKeys) {
    data.weeklyPaymentPauses[weekKey] = {
      weekKey,
      pausedBy: interaction.user.id,
      pausedByName: interaction.user.tag,
      pausedAt: Date.now(),
      reason,
    };
  }

  saveData(data);

  await sendToChannel(CONFIG.weeklyPaymentChannelId, {
    embeds: [
      new EmbedBuilder()
        .setColor(CONFIG.warningColor)
        .setTitle("💸 WOCHENABGABE AUSGESETZT")
        .setDescription(
          [
            "━━━━━━━━━━━━━━━━━━━━",
            `👑 **Eingetragen von:** <@${interaction.user.id}>`,
            `📅 **Ausgesetzte Wochen:**`,
            formatWeekList(weekKeys),
            "",
            `📝 **Grund:** ${reason}`,
            "",
            "In diesen Wochen zählt die Wochenabgabe nicht.",
            "Die Sonntagsübersicht zeigt dann automatisch, dass die Woche ausgesetzt ist.",
            "━━━━━━━━━━━━━━━━━━━━",
          ].join("\n")
        )
        .setFooter({ text: `${CONFIG.shortName} • Wochenabgabe` }),
    ],
    allowedMentions: { users: [interaction.user.id] },
  });

  return interaction.reply({
    content: [
      "✅ Wochenabgabe wurde ausgesetzt.",
      "",
      "**Ausgesetzte Wochen:**",
      formatWeekList(weekKeys),
    ].join("\n"),
    ephemeral: true,
  });
}

async function showWeeklyPaymentPauses(interaction) {
  const data = loadData();
  const pauses = Object.entries(data.weeklyPaymentPauses || {})
    .sort(([a], [b]) => a.localeCompare(b));

  if (pauses.length === 0) {
    return interaction.reply({
      content: "ℹ️ Aktuell sind keine Wochenabgaben ausgesetzt.",
      ephemeral: true,
    });
  }

  const lines = pauses.map(([weekKey, pause]) => {
    return `• **${weekKey}** — ${pause.reason || "Kein Grund"} — von <@${pause.pausedBy}>`;
  });

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(CONFIG.warningColor)
        .setTitle("📋 WOCHENABGABE-AUSSETZUNGEN")
        .setDescription(lines.join("\n").slice(0, 4000))
        .setFooter({ text: `${CONFIG.shortName} • Wochenabgabe` }),
    ],
    ephemeral: true,
    allowedMentions: { users: pauses.map(([, pause]) => pause.pausedBy).filter(Boolean).slice(0, 100) },
  });
}

function ensureWeeklyPaymentData(data, weekKey = getWeekKey()) {
  if (!data.weeklyPayments) data.weeklyPayments = {};

  if (!data.weeklyPayments[weekKey]) {
    data.weeklyPayments[weekKey] = {
      weekKey,
      paidUsers: {},
      createdAt: Date.now(),
    };
  }

  return data.weeklyPayments[weekKey];
}

function createWeeklyPaymentLogButtons(identifier, userId, removed = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`weekly_remove_${identifier}_${userId}`)
      .setLabel(removed ? "Entfernt" : "Zahlung entfernen")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(Boolean(removed))
  );
}

function createWeeklyPaymentLogEmbed({ userId, userName, weekKey = null, weekKeys = null, paidAt, removed = false, removedBy = null, removedByName = null, removedAt = null }) {
  const displayName = userName || "Unbekannter User";
  const weeks = weekKeys || (weekKey ? [weekKey] : []);
  const weekTitle = weeks.length === 1 ? "Woche" : "Wochen";

  if (removed) {
    return new EmbedBuilder()
      .setColor(CONFIG.dangerColor)
      .setTitle("❌ Wochenabgabe korrigiert")
      .setDescription(
        [
          "━━━━━━━━━━━━━━━━━━━━",
          `**Name:** ${displayName}`,
          `**Discord:** <@${userId}>`,
          `**${weekTitle}:**`,
          formatWeekList(weeks),
          `**Status:** Zahlung wurde entfernt`,
          `**Entfernt von:** ${removedByName || "Unbekannter User"} (<@${removedBy}>)`,
          `**Zeitpunkt:** ${formatGermanDateTimeFromMs(removedAt)}`,
          "━━━━━━━━━━━━━━━━━━━━",
        ].join("\n")
      )
      .setFooter({ text: `${CONFIG.shortName} • Wochenabgabe` });
  }

  return new EmbedBuilder()
    .setColor(CONFIG.successColor)
    .setTitle("💸 Wochenabgabe bezahlt")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━━━",
        `**Name:** ${displayName}`,
        `**Discord:** <@${userId}>`,
        `**${weekTitle}:**`,
        formatWeekList(weeks),
        `**Zeitraum:** ${weeks.length} ${weeks.length === 1 ? "Woche" : "Wochen"}`,
        `**Zeitpunkt:** ${formatGermanDateTimeFromMs(paidAt)}`,
        "━━━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setFooter({ text: `${CONFIG.shortName} • Wochenabgabe` });
}

function createWeeklyPaymentSelectRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("weekly_payment_select")
      .setPlaceholder("Für wie viele Wochen möchtest du bezahlen?")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        { label: "1 Woche", description: "Aktuelle Woche bestätigen", value: "1", emoji: "1️⃣" },
        { label: "2 Wochen", description: "Aktuelle + nächste Woche bestätigen", value: "2", emoji: "2️⃣" },
        { label: "3 Wochen", description: "Aktuelle + 2 weitere Wochen bestätigen", value: "3", emoji: "3️⃣" },
        { label: "4 Wochen", description: "Aktuelle + 3 weitere Wochen bestätigen", value: "4", emoji: "4️⃣" },
        { label: "5 Wochen", description: "Aktuelle + 4 weitere Wochen bestätigen", value: "5", emoji: "5️⃣" },
        { label: "6 Wochen", description: "Aktuelle + 5 weitere Wochen bestätigen", value: "6", emoji: "6️⃣" }
      )
  );
}

async function migrateWeeklyPaymentsFromJsonToDatabase() {
  if (!dbPool) return;

  const metaResult = await dbQuery("SELECT value FROM bot_meta WHERE key = $1", ["weekly_json_migrated"]);
  if (metaResult.rows.length > 0) return;

  const data = loadData();
  let migratedPayments = 0;
  let migratedSummaries = 0;

  for (const [weekKey, weekData] of Object.entries(data.weeklyPayments || {})) {
    for (const [userId, payment] of Object.entries(weekData.paidUsers || {})) {
      await dbQuery(
        `
        INSERT INTO weekly_payments
          (week_key, user_id, user_name, paid_at, batch_id, batch_week_keys, log_message_id, removed)
        VALUES
          ($1, $2, $3, $4, $5, $6::jsonb, $7, false)
        ON CONFLICT (week_key, user_id)
        DO NOTHING;
        `,
        [
          weekKey,
          userId,
          payment.userName || null,
          payment.paidAt || Date.now(),
          payment.batchId || null,
          JSON.stringify(payment.batchWeekKeys || [weekKey]),
          payment.logMessageId || null,
        ]
      );

      migratedPayments += 1;
    }
  }

  for (const [weekKey, summary] of Object.entries(data.weeklySummaries || {})) {
    await dbQuery(
      `
      INSERT INTO weekly_summaries
        (week_key, posted_at, reason, paid_count, unpaid_count)
      VALUES
        ($1, $2, $3, $4, $5)
      ON CONFLICT (week_key)
      DO NOTHING;
      `,
      [
        weekKey,
        summary.postedAt || Date.now(),
        summary.reason || "json-migration",
        summary.paidCount || 0,
        summary.unpaidCount || 0,
      ]
    );

    migratedSummaries += 1;
  }

  await dbQuery(
    `
    INSERT INTO bot_meta (key, value, updated_at)
    VALUES ($1, $2::jsonb, NOW())
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
    `,
    [
      "weekly_json_migrated",
      JSON.stringify({
        migratedAt: new Date().toISOString(),
        migratedPayments,
        migratedSummaries,
      }),
    ]
  );

  console.log(`✅ Wochenabgaben aus JSON in PostgreSQL geprüft/migriert: ${migratedPayments} Zahlungen, ${migratedSummaries} Übersichten.`);
}

async function getWeeklyPaymentDb(weekKey, userId) {
  const result = await dbQuery(
    `
    SELECT *
    FROM weekly_payments
    WHERE week_key = $1
      AND user_id = $2
      AND removed = false
    LIMIT 1;
    `,
    [weekKey, userId]
  );

  return result.rows[0] || null;
}

async function getWeeklyPaymentsForWeekDb(weekKey) {
  const result = await dbQuery(
    `
    SELECT *
    FROM weekly_payments
    WHERE week_key = $1
      AND removed = false
    ORDER BY paid_at ASC;
    `,
    [weekKey]
  );

  const paidUsers = {};

  for (const row of result.rows) {
    paidUsers[row.user_id] = {
      userId: row.user_id,
      userName: row.user_name,
      paidAt: Number(row.paid_at),
      batchId: row.batch_id,
      batchWeekKeys: row.batch_week_keys || [],
      logMessageId: row.log_message_id,
    };
  }

  return {
    weekKey,
    paidUsers,
  };
}

async function saveWeeklyPaymentDb({ weekKey, userId, userName, paidAt, batchId, batchWeekKeys, logMessageId = null }) {
  await dbQuery(
    `
    INSERT INTO weekly_payments
      (week_key, user_id, user_name, paid_at, batch_id, batch_week_keys, log_message_id, removed, removed_at, removed_by, updated_at)
    VALUES
      ($1, $2, $3, $4, $5, $6::jsonb, $7, false, null, null, NOW())
    ON CONFLICT (week_key, user_id)
    DO UPDATE SET
      user_name = EXCLUDED.user_name,
      paid_at = EXCLUDED.paid_at,
      batch_id = EXCLUDED.batch_id,
      batch_week_keys = EXCLUDED.batch_week_keys,
      log_message_id = EXCLUDED.log_message_id,
      removed = false,
      removed_at = null,
      removed_by = null,
      updated_at = NOW();
    `,
    [
      weekKey,
      userId,
      userName,
      paidAt,
      batchId,
      JSON.stringify(batchWeekKeys || [weekKey]),
      logMessageId,
    ]
  );
}

async function updateWeeklyPaymentLogMessageDb({ userId, weekKeys, batchId, logMessageId }) {
  if (!logMessageId || !weekKeys || weekKeys.length === 0) return;

  await dbQuery(
    `
    UPDATE weekly_payments
    SET log_message_id = $1,
        batch_id = $2,
        batch_week_keys = $3::jsonb,
        updated_at = NOW()
    WHERE user_id = $4
      AND week_key = ANY($5::text[])
      AND removed = false;
    `,
    [logMessageId, batchId, JSON.stringify(weekKeys), userId, weekKeys]
  );
}

async function removeWeeklyPaymentDb({ identifier, userId, removedAt, removedBy }) {
  const result = await dbQuery(
    `
    SELECT *
    FROM weekly_payments
    WHERE user_id = $1
      AND removed = false
      AND (batch_id = $2 OR week_key = $2)
    ORDER BY paid_at ASC;
    `,
    [userId, identifier]
  );

  if (result.rows.length === 0) {
    return {
      removedWeeks: [],
      paymentInfo: null,
    };
  }

  const removedWeeks = result.rows.map((row) => row.week_key);
  const first = result.rows[0];

  await dbQuery(
    `
    UPDATE weekly_payments
    SET removed = true,
        removed_at = $1,
        removed_by = $2,
        updated_at = NOW()
    WHERE user_id = $3
      AND removed = false
      AND week_key = ANY($4::text[]);
    `,
    [removedAt, removedBy, userId, removedWeeks]
  );

  return {
    removedWeeks,
    paymentInfo: {
      userId: first.user_id,
      userName: first.user_name,
      paidAt: Number(first.paid_at),
      batchId: first.batch_id,
      batchWeekKeys: first.batch_week_keys || removedWeeks,
      logMessageId: first.log_message_id,
    },
  };
}

async function hasWeeklySummaryDb(weekKey) {
  const result = await dbQuery(
    "SELECT week_key FROM weekly_summaries WHERE week_key = $1 LIMIT 1;",
    [weekKey]
  );

  return result.rows.length > 0;
}

async function saveWeeklySummaryDb({ weekKey, postedAt, reason, paidCount, unpaidCount }) {
  await dbQuery(
    `
    INSERT INTO weekly_summaries
      (week_key, posted_at, reason, paid_count, unpaid_count)
    VALUES
      ($1, $2, $3, $4, $5)
    ON CONFLICT (week_key)
    DO UPDATE SET
      posted_at = EXCLUDED.posted_at,
      reason = EXCLUDED.reason,
      paid_count = EXCLUDED.paid_count,
      unpaid_count = EXCLUDED.unpaid_count;
    `,
    [weekKey, postedAt, reason, paidCount, unpaidCount]
  );
}

async function getLatestMemberForWeeklyPayment(interaction) {
  const member = interaction.member;
  const freshMember = await interaction.guild.members.fetch(interaction.user.id).catch(() => member);

  await syncPayerRole(freshMember, "Wochenabgabe - Zahlende/r Prüfung");

  return await interaction.guild.members.fetch(interaction.user.id).catch(() => freshMember);
}

async function handleWeeklyPayment(interaction) {
  const latestMember = await getLatestMemberForWeeklyPayment(interaction);

  if (!latestMember.roles.cache.has(CONFIG.payerRoleId)) {
    return interaction.reply({
      content: "❌ Du hast aktuell nicht die Rolle **Zahlende/r** und musst deshalb keine Wochenabgabe bestätigen.",
      ephemeral: true,
    });
  }

  return interaction.reply({
    content: [
      "💸 **Wochenabgabe bestätigen**",
      "",
      "Wähle aus, für wie viele Wochen du deine Wochenabgabe bezahlt hast.",
      "Du kannst bis zu **6 Wochen** im Voraus bestätigen.",
      "",
      "Pausierte Wochen werden automatisch übersprungen.",
    ].join("\n"),
    components: [createWeeklyPaymentSelectRow()],
    ephemeral: true,
  });
}

async function handleWeeklyPaymentSelection(interaction) {
  const latestMember = await getLatestMemberForWeeklyPayment(interaction);

  if (!latestMember.roles.cache.has(CONFIG.payerRoleId)) {
    return interaction.reply({
      content: "❌ Du hast aktuell nicht die Rolle **Zahlende/r** und musst deshalb keine Wochenabgabe bestätigen.",
      ephemeral: true,
    });
  }

  const weekCount = Math.min(Math.max(Number(interaction.values[0]) || 1, 1), 6);
  const selectedWeekKeys = getWeekKeysFromNow(weekCount);

  const userName = getReadableUserName(latestMember, interaction.user);
  const paidAt = Date.now();
  const batchId = createShortId();

  const newlySavedWeeks = [];
  const alreadyPaidWeeks = [];
  const pausedWeeks = [];

  for (const weekKey of selectedWeekKeys) {
    if (isWeeklyPaymentPaused(weekKey)) {
      pausedWeeks.push(weekKey);
      continue;
    }

    const existingPayment = await getWeeklyPaymentDb(weekKey, interaction.user.id);

    if (existingPayment) {
      alreadyPaidWeeks.push(weekKey);
      continue;
    }

    await saveWeeklyPaymentDb({
      weekKey,
      userId: interaction.user.id,
      userName,
      paidAt,
      batchId,
      batchWeekKeys: selectedWeekKeys,
      logMessageId: null,
    });

    newlySavedWeeks.push(weekKey);
  }

  if (newlySavedWeeks.length === 0) {
    const lines = ["ℹ️ Für diese Auswahl musste nichts neu gespeichert werden."];

    if (alreadyPaidWeeks.length > 0) {
      lines.push("", "**Bereits bezahlt:**", formatWeekList(alreadyPaidWeeks));
    }

    if (pausedWeeks.length > 0) {
      lines.push("", "**Ausgesetzt:**", formatWeekList(pausedWeeks));
    }

    return interaction.update({
      content: lines.join("\n"),
      components: [],
    });
  }

  const logMessage = await sendToChannel(CONFIG.weeklyPaymentChannelId, {
    embeds: [
      createWeeklyPaymentLogEmbed({
        userId: interaction.user.id,
        userName,
        weekKeys: newlySavedWeeks,
        paidAt,
      }),
    ],
    components: [
      createWeeklyPaymentLogButtons(batchId, interaction.user.id),
    ],
  });

  if (logMessage) {
    await updateWeeklyPaymentLogMessageDb({
      userId: interaction.user.id,
      weekKeys: newlySavedWeeks,
      batchId,
      logMessageId: logMessage.id,
    });
  }

  let replyText = [
    `✅ Deine Wochenabgabe wurde gespeichert.`,
    "",
    "**Gespeichert für:**",
    formatWeekList(newlySavedWeeks),
  ];

  if (alreadyPaidWeeks.length > 0) {
    replyText.push("", "**Bereits vorher bezahlt:**", formatWeekList(alreadyPaidWeeks));
  }

  return interaction.update({
    content: replyText.join("\n"),
    components: [],
  });
}

async function removeWeeklyPayment(interaction, identifier, userId) {
  if (!hasLeaderPermission(interaction.member)) {
    return interaction.reply({
      content: "❌ Du hast keine Berechtigung, Wochenabgaben zu korrigieren.",
      ephemeral: true,
    });
  }

  const removedAt = Date.now();
  const removedBy = interaction.user.id;
  const removedByName = getReadableUserName(interaction.member, interaction.user);

  const { removedWeeks, paymentInfo } = await removeWeeklyPaymentDb({
    identifier,
    userId,
    removedAt,
    removedBy,
  });

  if (removedWeeks.length === 0 || !paymentInfo) {
    return interaction.reply({
      content: "ℹ️ Diese Zahlung ist bereits entfernt oder wurde nicht gefunden.",
      ephemeral: true,
    });
  }

  await interaction.message.edit({
    embeds: [
      createWeeklyPaymentLogEmbed({
        userId,
        userName: paymentInfo.userName,
        weekKeys: removedWeeks,
        paidAt: paymentInfo.paidAt,
        removed: true,
        removedBy,
        removedByName,
        removedAt,
      }),
    ],
    components: [
      createWeeklyPaymentLogButtons(identifier, userId, true),
    ],
  }).catch(() => {});

  await sendToChannel(CONFIG.weeklyPaymentChannelId, {
    embeds: [
      new EmbedBuilder()
        .setColor(CONFIG.warningColor)
        .setTitle("🛠️ Wochenabgabe angepasst")
        .setDescription(
          [
            "━━━━━━━━━━━━━━━━━━━━",
            `**Name:** ${paymentInfo.userName || `<@${userId}>`}`,
            `**Discord:** <@${userId}>`,
            `**Entfernte Wochen:**`,
            formatWeekList(removedWeeks),
            `**Aktion:** Zahlung wurde aus der Bezahlt-Liste entfernt`,
            `**Geändert von:** ${removedByName} (<@${removedBy}>)`,
            `**Zeitpunkt:** ${formatGermanDateTimeFromMs(removedAt)}`,
            "━━━━━━━━━━━━━━━━━━━━",
          ].join("\n")
        )
        .setFooter({ text: `${CONFIG.shortName} • Wochenabgabe-Log` }),
    ],
  });

  return interaction.reply({
    content: `✅ Zahlung von <@${userId}> wurde entfernt.\n\n**Entfernte Wochen:**\n${formatWeekList(removedWeeks)}`,
    ephemeral: true,
  });
}


async function getPayerMembers(guild) {
  const cacheAgeMs = Date.now() - payerMembersCache.fetchedAt;

  // Wenn wir gerade erst geprüft haben, nutzen wir den Cache.
  if (payerMembersCache.members.length > 0 && cacheAgeMs < 10 * 60 * 1000) {
    return payerMembersCache.members;
  }

  // Wichtig:
  // Nicht jedes Mal guild.members.fetch() ausführen.
  // Das löst bei Discord schnell Gateway Rate Limits aus.
  let cachedMembers = [...guild.members.cache.values()]
    .filter((member) => !member.user.bot)
    .filter((member) => member.roles.cache.has(CONFIG.payerRoleId));

  if (cachedMembers.length > 0) {
    payerMembersCache = {
      fetchedAt: Date.now(),
      members: cachedMembers,
    };

    return cachedMembers;
  }

  // Nur wenn der Cache leer ist, versuchen wir einmal alle Mitglieder zu laden.
  // Falls Discord rate-limited, brechen wir sauber ab statt den Bot zu stressen.
  try {
    const fetchedMembers = await guild.members.fetch();

    const payers = [...fetchedMembers.values()]
      .filter((member) => !member.user.bot)
      .filter((member) => member.roles.cache.has(CONFIG.payerRoleId));

    payerMembersCache = {
      fetchedAt: Date.now(),
      members: payers,
    };

    return payers;
  } catch (error) {
    console.error("❌ Mitglieder konnten für Wochenabgabe nicht geladen werden:", error);

    // Fallback: lieber leere Liste zurückgeben als den Bot crashen.
    return [];
  }
}

function formatMemberListForOverview(membersOrIds, paidUsers = null) {
  if (!membersOrIds || membersOrIds.length === 0) return "—";

  return membersOrIds
    .map((member) => {
      const name = member.displayName || member.user.username;
      return `╰ ${name}`;
    })
    .join("\n");
}


function splitLinesForDiscordFields(text, maxLength = 1000) {
  const lines = String(text || "—").split("\n");
  const chunks = [];
  let current = "";

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;

    if (next.length > maxLength) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);

  return chunks.length > 0 ? chunks : ["—"];
}

function addPaymentTableFields(embed, unpaidText, paidText, unpaidCount, paidCount) {
  const unpaidChunks = splitLinesForDiscordFields(unpaidText, 1000);
  const paidChunks = splitLinesForDiscordFields(paidText, 1000);
  const rows = Math.max(unpaidChunks.length, paidChunks.length);

  for (let index = 0; index < rows; index++) {
    embed.addFields(
      {
        name: index === 0 ? `❌ Nicht bezahlt (${unpaidCount})` : "\u200B",
        value: unpaidChunks[index] || "—",
        inline: true,
      },
      {
        name: index === 0 ? `✅ Bezahlt (${paidCount})` : "\u200B",
        value: paidChunks[index] || "—",
        inline: true,
      },
      {
        name: "\u200B",
        value: "\u200B",
        inline: true,
      }
    );
  }
}


async function manuallyAddWeeklyPayment(interaction) {
  if (!hasLeaderPermission(interaction.member)) {
    return interaction.reply({
      content: "❌ Du hast keine Berechtigung für diesen Befehl.",
      ephemeral: true,
    });
  }

  const targetUser = interaction.options.getUser("user");
  const weekCount = Math.min(Math.max(interaction.options.getInteger("wochen") || 1, 1), 6);
  const selectedWeekKeys = getWeekKeysFromNow(weekCount);
  const paidAt = Date.now();
  const batchId = createShortId();

  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  const userName = getReadableUserName(targetMember, targetUser);

  const newlySavedWeeks = [];
  const alreadyPaidWeeks = [];
  const pausedWeeks = [];

  for (const weekKey of selectedWeekKeys) {
    if (isWeeklyPaymentPaused(weekKey)) {
      pausedWeeks.push(weekKey);
      continue;
    }

    const existingPayment = await getWeeklyPaymentDb(weekKey, targetUser.id);

    if (existingPayment) {
      alreadyPaidWeeks.push(weekKey);
      continue;
    }

    await saveWeeklyPaymentDb({
      weekKey,
      userId: targetUser.id,
      userName,
      paidAt,
      batchId,
      batchWeekKeys: selectedWeekKeys,
      logMessageId: null,
    });

    newlySavedWeeks.push(weekKey);
  }

  if (newlySavedWeeks.length === 0) {
    const lines = [`ℹ️ Für ${targetUser} musste nichts neu gespeichert werden.`];

    if (alreadyPaidWeeks.length > 0) {
      lines.push("", "**Bereits bezahlt:**", formatWeekList(alreadyPaidWeeks));
    }

    if (pausedWeeks.length > 0) {
      lines.push("", "**Ausgesetzt:**", formatWeekList(pausedWeeks));
    }

    return interaction.reply({
      content: lines.join("\n"),
      ephemeral: true,
    });
  }

  const logMessage = await sendToChannel(CONFIG.weeklyPaymentChannelId, {
    embeds: [
      createWeeklyPaymentLogEmbed({
        userId: targetUser.id,
        userName,
        weekKeys: newlySavedWeeks,
        paidAt,
      }),
    ],
    components: [
      createWeeklyPaymentLogButtons(batchId, targetUser.id),
    ],
  });

  if (logMessage) {
    await updateWeeklyPaymentLogMessageDb({
      userId: targetUser.id,
      weekKeys: newlySavedWeeks,
      batchId,
      logMessageId: logMessage.id,
    });
  }

  const replyLines = [
    `✅ Wochenabgabe wurde manuell für ${targetUser} eingetragen.`,
    "",
    "**Gespeichert für:**",
    formatWeekList(newlySavedWeeks),
  ];

  if (alreadyPaidWeeks.length > 0) {
    replyLines.push("", "**Bereits vorher bezahlt:**", formatWeekList(alreadyPaidWeeks));
  }

  if (pausedWeeks.length > 0) {
    replyLines.push("", "**Ausgesetzt / zählt nicht:**", formatWeekList(pausedWeeks));
  }

  return interaction.reply({
    content: replyLines.join("\n"),
    ephemeral: true,
  });
}

async function postWeeklyPaymentOverview(reason = "scheduled") {
  const weekKey = getWeekKey();
  const pause = getWeeklyPaymentPause(weekKey);

  if (pause) {
    await sendToChannel(CONFIG.weeklyPaymentChannelId, {
      embeds: [createWeeklyPaymentPausedEmbed(weekKey, pause)],
      allowedMentions: { users: [pause.pausedBy].filter(Boolean) },
    });

    await saveWeeklySummaryDb({
      weekKey,
      postedAt: Date.now(),
      reason: `paused:${reason}`,
      paidCount: 0,
      unpaidCount: 0,
    });

    console.log(`ℹ️ Wochenabgabe-Übersicht für ${weekKey} wurde übersprungen, weil die Woche ausgesetzt ist.`);
    return;
  }

  const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);

  if (!guild) {
    console.error("❌ Guild für Wochenabgabe-Übersicht nicht gefunden.");
    return;
  }

  const weekData = await getWeeklyPaymentsForWeekDb(weekKey);

  const payers = await getPayerMembers(guild);

  if (payers.length === 0) {
    console.warn("⚠️ Keine Zahlungspflichtigen gefunden. Prüfe Member-Intent, Rollen-ID oder Discord-Cache.");
  }

  const paidIds = Object.keys(weekData.paidUsers || {});

  const paidMembers = payers.filter((member) => paidIds.includes(member.id));
  const unpaidMembers = payers.filter((member) => !paidIds.includes(member.id));

  const overviewEmbed = new EmbedBuilder()
    .setColor(CONFIG.embedColor)
    .setTitle("💸 WOCHENABGABE ÜBERSICHT")
    .setDescription(
      [
        `📅 **Woche:** ${weekKey}`,
        `🕘 **Stand:** ${formatGermanDateTimeFromMs(Date.now())}`,
        "",
        "**Info:**",
        `Bezahlt: **${paidMembers.length}**`,
        `Nicht bezahlt: **${unpaidMembers.length}**`,
        `Zahlungspflichtig: **${payers.length}**`,
      ].join("\n")
    )
    .setFooter({ text: `${CONFIG.shortName} • Wochenabgabe • ${weekKey}` });

  addPaymentTableFields(
    overviewEmbed,
    formatMemberListForOverview(unpaidMembers),
    formatMemberListForOverview(paidMembers, weekData.paidUsers),
    unpaidMembers.length,
    paidMembers.length
  );

  await sendToChannel(CONFIG.weeklyPaymentChannelId, {
    embeds: [overviewEmbed],
  });

  await saveWeeklySummaryDb({
    weekKey,
    postedAt: Date.now(),
    reason,
    paidCount: paidMembers.length,
    unpaidCount: unpaidMembers.length,
  });

  console.log(`✅ Wochenabgabe-Übersicht für ${weekKey} wurde gepostet.`);
}


async function checkWeeklyPaymentSummary() {
  const now = getBerlinParts();
  const weekKey = getWeekKey();

  // Sonntag ab 20:00 Uhr. Wenn Railway genau um 20:00 kurz offline ist,
  // wird die Übersicht später am Sonntag automatisch nachgeholt.
  if (now.weekday !== "Sonntag") return;
  if (Number(now.hour) < 20) return;

  const alreadyPosted = await hasWeeklySummaryDb(weekKey);
  if (alreadyPosted) return;

  await postWeeklyPaymentOverview("Sonntag 20:00 Uhr");
}



// =====================================================
// FUẞBALL-EVENTS
// =====================================================

function createFootballEventModal() {
  const modal = new ModalBuilder()
    .setCustomId("football_event_modal")
    .setTitle("⚽ SMV Fußball-Event");

  const titleInput = new TextInputBuilder()
    .setCustomId("football_title")
    .setLabel("⚔️ Begegnung")
    .setPlaceholder("z. B. SMV vs. CDB")
    .setStyle(TextInputStyle.Short)
    .setMinLength(3)
    .setMaxLength(80)
    .setRequired(true);

  const dateInput = new TextInputBuilder()
    .setCustomId("football_date")
    .setLabel("📅 Datum")
    .setPlaceholder("z. B. 21.05.2026")
    .setStyle(TextInputStyle.Short)
    .setMinLength(8)
    .setMaxLength(20)
    .setRequired(true);

  const timeInput = new TextInputBuilder()
    .setCustomId("football_time")
    .setLabel("🕘 Uhrzeit")
    .setPlaceholder("z. B. 21:30 - 22:30")
    .setStyle(TextInputStyle.Short)
    .setMinLength(5)
    .setMaxLength(30)
    .setRequired(true);

  const sizeInput = new TextInputBuilder()
    .setCustomId("football_size")
    .setLabel("👥 Spieleranzahl")
    .setPlaceholder("z. B. 15 vs 15")
    .setStyle(TextInputStyle.Short)
    .setMinLength(3)
    .setMaxLength(30)
    .setRequired(true);

  const locationInput = new TextInputBuilder()
    .setCustomId("football_location")
    .setLabel("📍 Standort")
    .setPlaceholder("z. B. Vespucci")
    .setStyle(TextInputStyle.Short)
    .setMinLength(2)
    .setMaxLength(80)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(dateInput),
    new ActionRowBuilder().addComponents(timeInput),
    new ActionRowBuilder().addComponents(sizeInput),
    new ActionRowBuilder().addComponents(locationInput)
  );

  return modal;
}

function createFootballTimeModal(eventId) {
  const modal = new ModalBuilder()
    .setCustomId(`football_time_modal_${eventId}`)
    .setTitle("🕘 Fußball-Uhrzeit ändern");

  const timeInput = new TextInputBuilder()
    .setCustomId("football_new_time")
    .setLabel("Neue Uhrzeit")
    .setPlaceholder("z. B. 22:00 - 23:00")
    .setStyle(TextInputStyle.Short)
    .setMinLength(4)
    .setMaxLength(30)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(timeInput));

  return modal;
}

function createFootballEventRecord({ title, dateText, timeText, sizeText, locationText, leaderId }) {
  return {
    id: createShortId(),
    title,
    dateText,
    timeText,
    sizeText,
    locationText,
    leaderId,
    createdAt: Date.now(),
    cancelled: false,
    cancelledBy: null,
    cancelledAt: null,
    lastTimeChangeBy: null,
    lastTimeChangeAt: null,
    messageId: null,
    users: {},
  };
}

function getFootballUsersByStatus(event, status) {
  return Object.entries(event.users || {})
    .filter(([, userData]) => userData.status === status)
    .map(([userId, userData]) => ({
      userId,
      name: userData.name || `<@${userId}>`,
    }));
}

function formatFootballUserList(users) {
  if (users.length === 0) return "—";

  return users
    .map((user) => `╰ ${user.name}`)
    .join("\n")
    .slice(0, 1000);
}

function getFootballStatus(event) {
  if (event.cancelled) return "Fußball abgesagt";
  return "Anmeldung offen";
}

function createFootballEventEmbed(event) {
  const presentUsers = getFootballUsersByStatus(event, "present");
  const absentUsers = getFootballUsersByStatus(event, "absent");
  const unsureUsers = getFootballUsersByStatus(event, "unsure");
  const total = presentUsers.length + absentUsers.length + unsureUsers.length;
  const statusText = getFootballStatus(event);

  return new EmbedBuilder()
    .setColor(event.cancelled ? CONFIG.dangerColor : CONFIG.embedColor)
    .setTitle(event.title)
    .setDescription(
      [
        "**Event Info:**",
        `📅 **Datum:** ${event.dateText}`,
        `🕘 **Beginn:** ${event.timeText}`,
        "",
        "**Deskription:**",
        `⚽ ${event.sizeText}`,
        `📍 Standort: ${event.locationText}`,
      ].join("\n")
    )
    .addFields(
      {
        name: `✅ Anwesend (${presentUsers.length})`,
        value: formatFootballUserList(presentUsers),
        inline: true,
      },
      {
        name: `❌ Abwesend (${absentUsers.length})`,
        value: formatFootballUserList(absentUsers),
        inline: true,
      },
      {
        name: `⏳ Ungewiss (${unsureUsers.length})`,
        value: formatFootballUserList(unsureUsers),
        inline: false,
      },
      {
        name: "Info",
        value: [
          `Status: **${statusText}**`,
          `Anmeldungen: **${total}**`,
          `Erstellt von: <@${event.leaderId}>`,
        ].join("\n"),
        inline: false,
      }
    )
    .setFooter({
      text: `${CONFIG.shortName} • Fußball-Event • ${event.dateText}`,
    });
}

function createFootballEventButtons(event) {
  const presentUsers = getFootballUsersByStatus(event, "present");
  const absentUsers = getFootballUsersByStatus(event, "absent");
  const unsureUsers = getFootballUsersByStatus(event, "unsure");
  const closed = Boolean(event.cancelled);

  const participationRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`football_present_${event.id}`)
      .setLabel(`${presentUsers.length}`)
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(closed),

    new ButtonBuilder()
      .setCustomId(`football_absent_${event.id}`)
      .setLabel(`${absentUsers.length}`)
      .setEmoji("❌")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(closed),

    new ButtonBuilder()
      .setCustomId(`football_unsure_${event.id}`)
      .setLabel(`${unsureUsers.length}`)
      .setEmoji("⏳")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(closed)
  );

  const managementRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`football_cancel_${event.id}`)
      .setLabel("Fußball absagen")
      .setEmoji("🛑")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(Boolean(event.cancelled)),

    new ButtonBuilder()
      .setCustomId(`football_reopen_${event.id}`)
      .setLabel("Fußball wieder öffnen")
      .setEmoji("🔓")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!event.cancelled),

    new ButtonBuilder()
      .setCustomId(`football_time_${event.id}`)
      .setLabel("Uhrzeit ändern")
      .setEmoji("🕘")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(Boolean(event.cancelled))
  );

  return [participationRow, managementRow];
}

async function updateFootballEventMessage(event) {
  if (!event.messageId) return;

  const channel = await client.channels.fetch(CONFIG.footballEventChannelId).catch(() => null);
  if (!channel) {
    console.error("❌ Fußball-Event-Channel nicht gefunden.");
    return;
  }

  const message = await channel.messages.fetch(event.messageId).catch(() => null);
  if (!message) {
    console.error("❌ Fußball-Event-Nachricht nicht gefunden.");
    return;
  }

  await message.edit({
    embeds: [createFootballEventEmbed(event)],
    components: createFootballEventButtons(event),
  });
}

async function announceFootballCancelled(event, leaderId) {
  await sendToChannel(CONFIG.footballEventChannelId, {
    content: [
      `<@&${CONFIG.lineupMentionRoleId}>`,
      "",
      "⚽ **FUẞBALL-EVENT ABGESAGT**",
      "",
      "Das heutige Fußball-Event wurde von der Fußballverwaltung abgesagt.",
      "",
      `📅 **Datum:** ${event.dateText}`,
      `🕘 **Ursprüngliche Uhrzeit:** ${event.timeText}`,
      `👑 **Abgesagt von:** <@${leaderId}>`,
    ].join("\n"),
    allowedMentions: { roles: [CONFIG.lineupMentionRoleId], users: [leaderId] },
  });
}

async function announceFootballReopened(event, leaderId) {
  await sendToChannel(CONFIG.footballEventChannelId, {
    content: [
      `<@&${CONFIG.lineupMentionRoleId}>`,
      "",
      "🔓 **FUẞBALL-EVENT WIEDER GEÖFFNET**",
      "",
      "Das heutige Fußball-Event wurde wieder geöffnet.",
      "",
      `📅 **Datum:** ${event.dateText}`,
      `🕘 **Beginn:** ${event.timeText}`,
      `👑 **Geöffnet von:** <@${leaderId}>`,
      "",
      "Ihr könnt euch jetzt wieder anmelden.",
    ].join("\n"),
    allowedMentions: { roles: [CONFIG.lineupMentionRoleId], users: [leaderId] },
  });
}

async function announceFootballTimeChanged(event, oldTime, newTime, leaderId) {
  await sendToChannel(CONFIG.footballEventChannelId, {
    content: [
      `<@&${CONFIG.lineupMentionRoleId}>`,
      "",
      "🕘 **FUẞBALL-UHRZEIT GEÄNDERT**",
      "",
      "Das Fußball-Event wurde verschoben.",
      "",
      `Alte Uhrzeit: **${oldTime}**`,
      `Neue Uhrzeit: **${newTime}**`,
      "",
      "Bitte beachtet die neue Uhrzeit.",
      `Uhrzeit geändert von: <@${leaderId}>`,
    ].join("\n"),
    allowedMentions: { roles: [CONFIG.lineupMentionRoleId], users: [leaderId] },
  });
}

async function cancelFootballEvent(interaction, eventId) {
  if (!hasFootballCreatorPermission(interaction.member)) {
    return interaction.reply({
      content: "❌ Du hast keine Berechtigung, Fußball-Events abzusagen.",
      ephemeral: true,
    });
  }

  const data = loadData();
  const event = data.footballEvents[eventId];

  if (!event) {
    return interaction.reply({
      content: "❌ Dieses Fußball-Event wurde nicht im Speicher gefunden.",
      ephemeral: true,
    });
  }

  if (event.cancelled) {
    return interaction.reply({
      content: "ℹ️ Dieses Fußball-Event wurde bereits abgesagt.",
      ephemeral: true,
    });
  }

  event.cancelled = true;
  event.cancelledBy = interaction.user.id;
  event.cancelledAt = Date.now();

  data.footballEvents[eventId] = event;
  saveData(data);

  await updateFootballEventMessage(event);
  await announceFootballCancelled(event, interaction.user.id);

  return interaction.reply({
    content: "✅ Fußball-Event wurde abgesagt und die SMV-Rolle wurde informiert.",
    ephemeral: true,
  });
}

async function reopenFootballEvent(interaction, eventId) {
  if (!hasFootballCreatorPermission(interaction.member)) {
    return interaction.reply({
      content: "❌ Du hast keine Berechtigung, Fußball-Events wieder zu öffnen.",
      ephemeral: true,
    });
  }

  const data = loadData();
  const event = data.footballEvents[eventId];

  if (!event) {
    return interaction.reply({
      content: "❌ Dieses Fußball-Event wurde nicht im Speicher gefunden.",
      ephemeral: true,
    });
  }

  if (!event.cancelled) {
    return interaction.reply({
      content: "ℹ️ Dieses Fußball-Event ist bereits geöffnet.",
      ephemeral: true,
    });
  }

  event.cancelled = false;
  event.cancelledBy = null;
  event.cancelledAt = null;
  event.reopenedBy = interaction.user.id;
  event.reopenedAt = Date.now();

  data.footballEvents[eventId] = event;
  saveData(data);

  await updateFootballEventMessage(event);
  await announceFootballReopened(event, interaction.user.id);

  return interaction.reply({
    content: "✅ Fußball-Event wurde wieder geöffnet und die SMV-Rolle wurde informiert.",
    ephemeral: true,
  });
}

async function changeFootballTime(interaction, eventId) {
  if (!hasFootballCreatorPermission(interaction.member)) {
    return interaction.reply({
      content: "❌ Du hast keine Berechtigung, die Fußball-Uhrzeit zu ändern.",
      ephemeral: true,
    });
  }

  const data = loadData();
  const event = data.footballEvents[eventId];

  if (!event) {
    return interaction.reply({
      content: "❌ Dieses Fußball-Event wurde nicht im Speicher gefunden.",
      ephemeral: true,
    });
  }

  if (event.cancelled) {
    return interaction.reply({
      content: "ℹ️ Dieses Fußball-Event wurde bereits abgesagt. Die Uhrzeit kann nicht mehr geändert werden.",
      ephemeral: true,
    });
  }

  const oldTime = event.timeText;
  const newTime = normalizeLineupTimeText(interaction.fields.getTextInputValue("football_new_time"));

  event.timeText = newTime;
  event.lastTimeChangeBy = interaction.user.id;
  event.lastTimeChangeAt = Date.now();

  data.footballEvents[eventId] = event;
  saveData(data);

  await updateFootballEventMessage(event);
  await announceFootballTimeChanged(event, oldTime, newTime, interaction.user.id);

  return interaction.reply({
    content: `✅ Fußball-Uhrzeit wurde von **${oldTime}** auf **${newTime}** geändert und die SMV-Rolle wurde informiert.`,
    ephemeral: true,
  });
}

async function createAndPostFootballEvent(interaction) {
  const title = interaction.fields.getTextInputValue("football_title").trim();
  const dateText = interaction.fields.getTextInputValue("football_date").trim();
  const timeText = interaction.fields.getTextInputValue("football_time").trim();
  const sizeText = interaction.fields.getTextInputValue("football_size").trim();
  const locationText = interaction.fields.getTextInputValue("football_location").trim();

  const event = createFootballEventRecord({
    title,
    dateText,
    timeText,
    sizeText,
    locationText,
    leaderId: interaction.user.id,
  });

  const message = await sendToChannel(CONFIG.footballEventChannelId, {
    content: `<@&${CONFIG.lineupMentionRoleId}>`,
    embeds: [createFootballEventEmbed(event)],
    components: createFootballEventButtons(event),
    allowedMentions: { roles: [CONFIG.lineupMentionRoleId] },
  });

  if (!message) {
    return interaction.reply({
      content: "❌ Der Fußball-Event-Channel wurde nicht gefunden.",
      ephemeral: true,
    });
  }

  event.messageId = message.id;

  const data = loadData();
  data.footballEvents[event.id] = event;
  saveData(data);

  return interaction.reply({
    content: `✅ Fußball-Event wurde erfolgreich in <#${CONFIG.footballEventChannelId}> erstellt.`,
    ephemeral: true,
  });
}


async function checkAbsenceDeletions() {
  const now = getBerlinParts();

  // Abmeldungen werden bewusst nur nachts um 00 Uhr geprüft.
  // Da der Scheduler jede Minute läuft, bedeutet das: zwischen 00:00 und 00:59.
  if (now.hour !== "00") return;

  const data = loadData();

  if (!data.absences || Object.keys(data.absences).length === 0) return;

  let changed = false;

  for (const [absenceId, absence] of Object.entries(data.absences)) {
    if (!shouldDeleteAbsence(absence, now.dateKey)) continue;

    const channel = await client.channels.fetch(absence.channelId || CONFIG.absenceChannelId).catch(() => null);

    if (!channel || !channel.messages) {
      console.error(`❌ Abmeldungs-Channel nicht gefunden: ${absence.channelId || CONFIG.absenceChannelId}`);
      continue;
    }

    const message = await channel.messages.fetch(absence.messageId).catch(() => null);

    if (message) {
      await message.delete().catch((error) => {
        console.error(`❌ Abmeldung ${absence.messageId} konnte nicht gelöscht werden:`, error.message);
      });
    }

    delete data.absences[absenceId];
    changed = true;

    console.log(`🧹 Abmeldung automatisch gelöscht/entfernt: ${absence.name || absence.userId || absenceId}`);
  }

  if (changed) saveData(data);
}


// =====================================================
// SCHEDULER
// =====================================================

function startSchedulers() {
  // Direkt beim Start prüfen.
  checkDailyLineup().catch((error) => {
    console.error("❌ Fehler bei erster Aufstellungsprüfung:", error);
  });

  checkOverdueSanctions().catch((error) => {
    console.error("❌ Fehler bei erster Sanktionsprüfung:", error);
  });

  checkWeeklyPaymentSummary().catch((error) => {
    console.error("❌ Fehler bei erster Wochenabgabe-Prüfung:", error);
  });

  checkLineupClosures().catch((error) => {
    console.error("❌ Fehler bei erster Aufstellungs-Schließprüfung:", error);
  });

  checkAbsenceDeletions().catch((error) => {
    console.error("❌ Fehler bei erster Abmeldungs-Löschprüfung:", error);
  });

  // Jede Minute prüfen.
  setInterval(() => {
    checkDailyLineup().catch((error) => {
      console.error("❌ Fehler bei Aufstellungsprüfung:", error);
    });

    checkOverdueSanctions().catch((error) => {
      console.error("❌ Fehler bei Sanktionsprüfung:", error);
    });

    checkWeeklyPaymentSummary().catch((error) => {
      console.error("❌ Fehler bei Wochenabgabe-Prüfung:", error);
    });

    checkLineupClosures().catch((error) => {
      console.error("❌ Fehler bei Aufstellungs-Schließprüfung:", error);
    });

    checkAbsenceDeletions().catch((error) => {
      console.error("❌ Fehler bei Abmeldungs-Löschprüfung:", error);
    });
  }, 60 * 1000);

  console.log("✅ Scheduler wurde gestartet.");
}

// =====================================================
// SLASH COMMANDS
// =====================================================

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("registrierpanel")
      .setDescription("Sendet das SMV Registrierungspanel")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .toJSON(),

    new SlashCommandBuilder()
      .setName("aufstellung-test")
      .setDescription("Erstellt manuell eine Aufstellung für heute, wenn heute ein Aufstellungstag ist")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .toJSON(),

    new SlashCommandBuilder()
      .setName("aufstellung-erzwingen")
      .setDescription("Postet die heutige Aufstellung sofort neu, auch wenn intern schon etwas gespeichert ist")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .toJSON(),

    new SlashCommandBuilder()
      .setName("leaderpanel")
      .setDescription("Sendet das SMV Leaderpanel")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .toJSON(),

    new SlashCommandBuilder()
      .setName("familienpanel")
      .setDescription("Sendet das SMV Familienpanel")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .toJSON(),

    new SlashCommandBuilder()
      .setName("zahlende-sync")
      .setDescription("Prüft und vergibt/entfernt die Zahlende/r-Rolle bei allen Mitgliedern")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .toJSON(),

    new SlashCommandBuilder()
      .setName("wochenabgabe-uebersicht")
      .setDescription("Postet manuell die aktuelle Wochenabgabe-Übersicht")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .toJSON(),

    new SlashCommandBuilder()
      .setName("wochenabgabe-eintragen")
      .setDescription("Trägt eine Wochenabgabe manuell für 1 bis 6 Wochen ein")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription("Für welchen User soll die Wochenabgabe eingetragen werden?")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("wochen")
          .setDescription("Für wie viele Wochen soll eingetragen werden?")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(6)
      )
      .toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );

  console.log("✅ Slash Commands wurden registriert.");
}

// =====================================================
// BOT START
// =====================================================

client.once("clientReady", async () => {
  console.log(`✅ ${CONFIG.botName} ist online als ${client.user.tag}`);

  client.user.setPresence({
    status: "online",
    activities: [
      {
        name: "Made by Kquwi☦︎",
        type: ActivityType.Playing,
      },
    ],
  });

  try {
    await initDatabase();
    await migrateWeeklyPaymentsFromJsonToDatabase();
  } catch (error) {
    console.error("❌ Datenbank konnte nicht vorbereitet werden:", error);
  }

  try {
    await registerCommands();
  } catch (error) {
    console.error("❌ Fehler beim Registrieren der Slash Commands:", error);
  }

  await syncAllPayerRoles("Bot-Start - automatische Zahlende/r Prüfung");

  startSchedulers();
});

// =====================================================
// JOIN / LEAVE
// =====================================================

client.on("guildMemberAdd", async (member) => {
  try {
    const message = [
      `Privet ${member},`,
      `du bist nun Teil der Familie **${CONFIG.familyName}**.`,
      "**Dobro pozhalovat v semyu**, schön, dass du dabei bist. 🐻",
      "",
      `**Bitte registriere dich im folgenden Channel:** <#${CONFIG.registrationChannelId}>`,
    ].join("\n");

    await sendToChannel(CONFIG.welcomeChannelId, {
      content: message,
    });

    await syncPayerRole(member, "Beitritt - Zahlende/r Prüfung");

    console.log(`✅ Willkommensnachricht gesendet für ${member.user.tag}`);
  } catch (error) {
    console.error("❌ Fehler bei guildMemberAdd:", error);
  }
});

client.on("guildMemberRemove", async (member) => {
  try {
    const message = `Poka, <@${member.id}>!`;

    await sendToChannel(CONFIG.leaveChannelId, {
      content: message,
      allowedMentions: { users: [member.id] },
    });

    console.log(`✅ Leave-Nachricht gesendet für ${member.user.tag}`);
  } catch (error) {
    console.error("❌ Fehler bei guildMemberRemove:", error);
  }
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  try {
    await syncPayerRole(newMember, "Rollenänderung - Zahlende/r Prüfung");
  } catch (error) {
    console.error("❌ Fehler bei guildMemberUpdate:", error);
  }
});

// =====================================================
// INTERACTIONS
// =====================================================

client.on("interactionCreate", async (interaction) => {
  try {
    // -------------------------------
    // Slash Commands
    // -------------------------------

    if (interaction.isChatInputCommand() && interaction.commandName === "registrierpanel") {
      const embed = createRegisterPanelEmbed();
      const row = createRegisterButtonRow();

      await sendToChannel(CONFIG.registrationChannelId, {
        embeds: [embed],
        components: [row],
      });

      return interaction.reply({
        content: `✅ Registrierungspanel wurde erfolgreich in <#${CONFIG.registrationChannelId}> gesendet.`,
        ephemeral: true,
      });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "aufstellung-test") {
      await interaction.reply({
        content: "✅ Test wird ausgeführt. Ich prüfe, ob für heute eine Aufstellung erstellt werden soll.",
        ephemeral: true,
      });

      await createLineupForToday("manual-test");
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "aufstellung-erzwingen") {
      if (!hasLeaderPermission(interaction.member)) {
        return interaction.reply({
          content: "❌ Du hast keine Berechtigung, die Aufstellung zu erzwingen.",
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: "⏳ Ich poste die heutige Aufstellung jetzt neu.",
        ephemeral: true,
      });

      const result = await forcePostLineupForToday(`Manuell erzwungen von ${interaction.user.tag}`);

      return interaction.followUp({
        content: result.ok ? `✅ ${result.message}` : `❌ ${result.message}`,
        ephemeral: true,
      });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "leaderpanel") {
      if (!hasLeaderPermission(interaction.member)) {
        return interaction.reply({
          content: "❌ Du hast keine Berechtigung für das Leaderpanel.",
          ephemeral: true,
        });
      }

      await interaction.channel.send({
        embeds: [createLeaderPanelEmbed()],
        components: [createLeaderPanelButtons()],
      });

      return interaction.reply({
        content: "✅ Leaderpanel wurde gesendet.",
        ephemeral: true,
      });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "familienpanel") {
      await interaction.channel.send({
        embeds: [createFamilyPanelEmbed()],
        components: [createFamilyPanelButtons()],
      });

      return interaction.reply({
        content: "✅ Familienpanel wurde gesendet.",
        ephemeral: true,
      });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "zahlende-sync") {
      if (!hasLeaderPermission(interaction.member)) {
        return interaction.reply({
          content: "❌ Du hast keine Berechtigung für diesen Befehl.",
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: "⏳ Ich prüfe jetzt alle Mitglieder und vergebe/entferne die Zahlende/r-Rolle automatisch.",
        ephemeral: true,
      });

      await syncAllPayerRoles(`Manueller Sync von ${interaction.user.tag}`);

      return interaction.followUp({
        content: "✅ Zahlende/r-Rollen wurden geprüft.",
        ephemeral: true,
      });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "wochenabgabe-uebersicht") {
      if (!hasLeaderPermission(interaction.member)) {
        return interaction.reply({
          content: "❌ Du hast keine Berechtigung für diesen Befehl.",
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: "✅ Wochenabgabe-Übersicht wird erstellt.",
        ephemeral: true,
      });

      await postWeeklyPaymentOverview(`Manuell von ${interaction.user.tag}`);

      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "wochenabgabe-eintragen") {
      return manuallyAddWeeklyPayment(interaction);
    }

    // -------------------------------
    // Familienpanel / Abmeldung / Fußball-Event
    // -------------------------------

    if (interaction.isButton() && interaction.customId === "family_absence") {
      return interaction.showModal(createAbsenceModal());
    }

    if (interaction.isButton() && interaction.customId === "family_weekly_payment") {
      return handleWeeklyPayment(interaction);
    }

    if (interaction.isButton() && interaction.customId === "family_create_football") {
      if (!hasFootballCreatorPermission(interaction.member)) {
        return interaction.reply({
          content: "❌ Du hast keine Berechtigung, Fußball-Events zu erstellen.",
          ephemeral: true,
        });
      }

      return interaction.showModal(createFootballEventModal());
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "weekly_payment_select") {
      return handleWeeklyPaymentSelection(interaction);
    }

    if (interaction.isButton() && interaction.customId.startsWith("weekly_remove_")) {
      const parts = interaction.customId.split("_");
      const identifier = parts[2];
      const userId = parts[3];

      return removeWeeklyPayment(interaction, identifier, userId);
    }

    if (interaction.isModalSubmit() && interaction.customId === "absence_modal") {
      return postAbsence(interaction);
    }

    // -------------------------------
    // Registrierung
    // -------------------------------

    if (interaction.isButton() && interaction.customId === "smv_register_button") {
      return interaction.showModal(createRegisterModal());
    }

    if (interaction.isModalSubmit() && interaction.customId === "football_event_modal") {
      if (!hasFootballCreatorPermission(interaction.member)) {
        return interaction.reply({
          content: "❌ Du hast keine Berechtigung, Fußball-Events zu erstellen.",
          ephemeral: true,
        });
      }

      return createAndPostFootballEvent(interaction);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("football_time_modal_")) {
      const eventId = interaction.customId.replace("football_time_modal_", "");
      return changeFootballTime(interaction, eventId);
    }

    if (interaction.isModalSubmit() && interaction.customId === "smv_register_modal") {
      const firstName = cleanName(interaction.fields.getTextInputValue("first_name"));
      const lastName = cleanName(interaction.fields.getTextInputValue("last_name"));

      if (!firstName || !lastName) {
        return interaction.reply({
          content: "❌ Bitte gib einen gültigen Vor- und Nachnamen ein.",
          ephemeral: true,
        });
      }

      const newNickname = `${CONFIG.nicknamePrefix} ${firstName} ${lastName}`;

      if (newNickname.length > 32) {
        return interaction.reply({
          content: "❌ Der Name ist leider zu lang. Discord erlaubt maximal 32 Zeichen beim Nickname.",
          ephemeral: true,
        });
      }

      const member = interaction.member;

      if (!member) {
        return interaction.reply({
          content: "❌ Dein Serverprofil konnte nicht gefunden werden.",
          ephemeral: true,
        });
      }

      await member.setNickname(newNickname, "SMV Registrierung");

      const { addedRoles, failedRoles } = await addRegisteredRoles(member);

      let replyMessage = `✅ Du wurdest erfolgreich registriert.\nDein neuer Name ist: **${newNickname}**`;

      if (addedRoles.length > 0) {
        replyMessage += "\n\n✅ Rollen wurden vergeben.";
      }

      if (failedRoles.length > 0) {
        replyMessage += "\n\n⚠️ Einige Rollen konnten nicht vergeben werden. Bitte melde dich beim Team.";
      }

      return interaction.reply({
        content: replyMessage,
        ephemeral: true,
      });
    }

    // -------------------------------
    // Aufstellung Buttons
    // -------------------------------

    if (interaction.isButton() && interaction.customId.startsWith("lineup_cancel_")) {
      const dateKey = interaction.customId.replace("lineup_cancel_", "");
      return cancelLineup(interaction, dateKey);
    }

    if (interaction.isButton() && interaction.customId.startsWith("lineup_reopen_")) {
      const dateKey = interaction.customId.replace("lineup_reopen_", "");
      return reopenLineup(interaction, dateKey);
    }

    if (interaction.isButton() && interaction.customId.startsWith("lineup_time_")) {
      const dateKey = interaction.customId.replace("lineup_time_", "");

      if (!hasLeaderPermission(interaction.member)) {
        return interaction.reply({
          content: "❌ Du hast keine Berechtigung, die Aufstellungsuhrzeit zu ändern.",
          ephemeral: true,
        });
      }

      return interaction.showModal(createLineupTimeModal(dateKey));
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("lineup_time_modal_")) {
      const dateKey = interaction.customId.replace("lineup_time_modal_", "");
      return changeLineupTime(interaction, dateKey);
    }

    if (interaction.isButton() && interaction.customId.startsWith("lineup_")) {
      const parts = interaction.customId.split("_");
      const action = parts[1];
      const dateKey = parts.slice(2).join("_");

      const statusMap = {
        present: "present",
        absent: "absent",
      };

      const selectedStatus = statusMap[action];

      if (!selectedStatus) {
        return interaction.reply({
          content: "❌ Ungültige Auswahl.",
          ephemeral: true,
        });
      }

      const data = loadData();
      const lineup = data.lineups[dateKey];

      if (!lineup) {
        return interaction.reply({
          content: "❌ Diese Aufstellung wurde nicht im Speicher gefunden. Bitte melde dich beim Team.",
          ephemeral: true,
        });
      }

      if (isLineupInteractionClosed(lineup)) {
        lineup.closed = true;
        data.lineups[dateKey] = lineup;
        saveData(data);
        await updateLineupMessage(lineup);

        return interaction.reply({
          content: lineup.cancelled
            ? "❌ Diese Aufstellung wurde abgesagt. Du kannst nicht mehr reagieren."
            : "❌ Die Anmeldung ist geschlossen. Du kannst nicht mehr reagieren.",
          ephemeral: true,
        });
      }

      const member = interaction.member;
      const userId = interaction.user.id;

      lineup.users[userId] = {
        status: selectedStatus,
        name: getMemberName(member, userId),
        updatedAt: new Date().toISOString(),
      };

      data.lineups[dateKey] = lineup;
      saveData(data);

      await updateLineupMessage(lineup);

      const statusText = {
        present: "Anwesend",
        absent: "Abwesend",
      }[selectedStatus];

      return interaction.reply({
        content: `✅ Deine Auswahl wurde gespeichert: **${statusText}**`,
        ephemeral: true,
      });
    }

    // -------------------------------
    // -------------------------------
    // Fußball-Event Buttons
    // -------------------------------

    if (interaction.isButton() && interaction.customId.startsWith("football_")) {
      const parts = interaction.customId.split("_");
      const action = parts[1];
      const eventId = parts.slice(2).join("_");

      if (action === "cancel") {
        return cancelFootballEvent(interaction, eventId);
      }

      if (action === "reopen") {
        return reopenFootballEvent(interaction, eventId);
      }

      if (action === "time") {
        if (!hasFootballCreatorPermission(interaction.member)) {
          return interaction.reply({
            content: "❌ Du hast keine Berechtigung, die Fußball-Uhrzeit zu ändern.",
            ephemeral: true,
          });
        }

        return interaction.showModal(createFootballTimeModal(eventId));
      }

      const statusMap = {
        present: "present",
        absent: "absent",
        unsure: "unsure",
      };

      const selectedStatus = statusMap[action];

      if (!selectedStatus) {
        return interaction.reply({
          content: "❌ Ungültige Auswahl.",
          ephemeral: true,
        });
      }

      const data = loadData();
      const event = data.footballEvents[eventId];

      if (!event) {
        return interaction.reply({
          content: "❌ Dieses Fußball-Event wurde nicht im Speicher gefunden. Bitte melde dich beim Team.",
          ephemeral: true,
        });
      }

      if (event.cancelled) {
        return interaction.reply({
          content: "ℹ️ Dieses Fußball-Event wurde abgesagt. Du kannst dich nicht mehr eintragen.",
          ephemeral: true,
        });
      }

      const member = interaction.member;
      const userId = interaction.user.id;

      event.users[userId] = {
        status: selectedStatus,
        name: getMemberName(member, userId),
        updatedAt: new Date().toISOString(),
      };

      data.footballEvents[eventId] = event;
      saveData(data);

      await updateFootballEventMessage(event);

      const statusText = {
        present: "Anwesend",
        absent: "Abwesend",
      }[selectedStatus];

      return interaction.reply({
        content: `✅ Deine Auswahl wurde gespeichert: **${statusText}**`,
        ephemeral: true,
      });
    }

    // -------------------------------
    // Leaderpanel / Sanktionen
    // -------------------------------

    if (interaction.isButton() && interaction.customId === "leader_weekly_manage") {
      if (!hasLeaderPermission(interaction.member)) {
        return interaction.reply({
          content: "❌ Du hast keine Berechtigung, die Wochenabgabe zu verwalten.",
          ephemeral: true,
        });
      }

      return interaction.reply({
        content: "💸 **Wochenabgabe verwalten**\n\nWähle unten aus, was du machen möchtest.",
        components: [createWeeklyPaymentManageMenu()],
        ephemeral: true,
      });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "weekly_pause_manage_select") {
      if (!hasLeaderPermission(interaction.member)) {
        return interaction.reply({
          content: "❌ Du hast keine Berechtigung, die Wochenabgabe zu verwalten.",
          ephemeral: true,
        });
      }

      const selectedAction = interaction.values[0];

      if (selectedAction === "pause") {
        return interaction.showModal(createWeeklyPaymentPauseModal());
      }

      if (selectedAction === "show") {
        return showWeeklyPaymentPauses(interaction);
      }

      return interaction.reply({
        content: "❌ Ungültige Auswahl.",
        ephemeral: true,
      });
    }

    if (interaction.isModalSubmit() && interaction.customId === "weekly_pause_modal") {
      return handleWeeklyPaymentPauseModal(interaction);
    }

    if (
      (interaction.isButton() && interaction.customId.startsWith("leader_")) ||
      (interaction.isButton() && interaction.customId.startsWith("sanction_")) ||
      (interaction.isUserSelectMenu() && interaction.customId.startsWith("sanction_")) ||
      (interaction.isStringSelectMenu() && interaction.customId.startsWith("sanction_"))
    ) {
      if (!hasLeaderPermission(interaction.member)) {
        return interaction.reply({
          content: "❌ Du hast keine Berechtigung für diese Aktion.",
          ephemeral: true,
        });
      }
    }

    if (interaction.isButton() && interaction.customId === "leader_create_sanction") {
      createSanctionDraft(interaction.user.id);

      return interaction.reply({
        content: createSanctionDraftText(interaction.user.id),
        components: createSanctionBuilderComponents(interaction.user.id),
        ephemeral: true,
      });
    }

    if (interaction.isButton() && interaction.customId === "leader_create_football") {
      return interaction.reply({
        content: "ℹ️ Der Fußball-Event-Button wurde ins Familienpanel verschoben. Bitte nutze dort den Button **Fußball-Event**.",
        ephemeral: true,
      });
    }

    if (interaction.isUserSelectMenu() && interaction.customId === "sanction_user_select") {
      const draft = getSanctionDraft(interaction.user.id);
      draft.targetUserId = interaction.values[0];
      sanctionDrafts.set(interaction.user.id, draft);

      return interaction.update({
        content: createSanctionDraftText(interaction.user.id),
        components: createSanctionBuilderComponents(interaction.user.id),
      });
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("sanction_select_")) {
      const group = interaction.customId.replace("sanction_select_", "");
      const draft = getSanctionDraft(interaction.user.id);

      if (!draft.selectedByMenu[group]) {
        draft.selectedByMenu[group] = [];
      }

      // Wichtig:
      // Neue Auswahl wird zur alten Auswahl hinzugefügt.
      // Dadurch verschwinden bereits ausgewählte Sanktionen aus derselben Kategorie nicht mehr.
      const oldValues = draft.selectedByMenu[group] || [];
      const newValues = interaction.values || [];

      draft.selectedByMenu[group] = [...new Set([...oldValues, ...newValues])];

      sanctionDrafts.set(interaction.user.id, draft);

      return interaction.update({
        content: createSanctionDraftText(interaction.user.id),
        components: createSanctionBuilderComponents(interaction.user.id),
      });
    }

    if (interaction.isButton() && interaction.customId === "sanction_clear") {
      createSanctionDraft(interaction.user.id);

      return interaction.update({
        content: createSanctionDraftText(interaction.user.id),
        components: createSanctionBuilderComponents(interaction.user.id),
      });
    }

    if (interaction.isButton() && interaction.customId === "sanction_submit") {
      const draft = getSanctionDraft(interaction.user.id);
      return createAndPostSanction(interaction, draft);
    }

    if (interaction.isButton() && interaction.customId.startsWith("sanction_cancel_")) {
      const sanctionId = interaction.customId.replace("sanction_cancel_", "");
      const data = loadData();
      const record = data.sanctions[sanctionId];

      if (!record) {
        return interaction.reply({
          content: "❌ Diese Sanktion wurde nicht im Speicher gefunden.",
          ephemeral: true,
        });
      }

      if (record.paid) {
        return interaction.reply({
          content: "ℹ️ Diese Sanktion wurde bereits als bezahlt markiert und kann nicht mehr storniert werden.",
          ephemeral: true,
        });
      }

      if (record.cancelled) {
        return interaction.reply({
          content: "ℹ️ Diese Sanktion wurde bereits storniert.",
          ephemeral: true,
        });
      }

      record.cancelled = true;
      record.cancelledAt = Date.now();
      record.cancelledBy = interaction.user.id;

      data.sanctions[sanctionId] = record;
      saveData(data);

      await updateSanctionMessage(record);

      await sendToChannel(CONFIG.sanctionLogChannelId, {
        embeds: [
          new EmbedBuilder()
            .setColor(CONFIG.dangerColor)
            .setTitle("❌ Sanktion storniert")
            .setDescription(
              [
                "━━━━━━━━━━━━━━━━━━━━",
                `**Name:** <@${record.targetUserId}>`,
                `**Storniert von:** <@${interaction.user.id}>`,
                `**Zeitpunkt:** <t:${unixTimestamp(record.cancelledAt)}:F>`,
                `**Sanktion-ID:** \`${record.id}\``,
                "━━━━━━━━━━━━━━━━━━━━",
              ].join("\n")
            )
            .setFooter({ text: `${CONFIG.shortName} • Sanktionslog` }),
        ],
      });

      return interaction.reply({
        content: "✅ Sanktion wurde storniert.",
        ephemeral: true,
      });
    }

    if (interaction.isButton() && interaction.customId.startsWith("sanction_paid_")) {
      const sanctionId = interaction.customId.replace("sanction_paid_", "");
      const data = loadData();
      const record = data.sanctions[sanctionId];

      if (!record) {
        return interaction.reply({
          content: "❌ Diese Sanktion wurde nicht im Speicher gefunden.",
          ephemeral: true,
        });
      }

      if (record.paid) {
        return interaction.reply({
          content: "ℹ️ Diese Sanktion wurde bereits als bezahlt markiert.",
          ephemeral: true,
        });
      }

      if (record.cancelled) {
        return interaction.reply({
          content: "ℹ️ Diese Sanktion wurde bereits storniert.",
          ephemeral: true,
        });
      }

      record.paid = true;
      record.paidAt = Date.now();
      record.paidBy = interaction.user.id;

      data.sanctions[sanctionId] = record;
      saveData(data);

      await updateSanctionMessage(record);

      await sendToChannel(CONFIG.sanctionLogChannelId, {
        embeds: [
          new EmbedBuilder()
            .setColor(CONFIG.successColor)
            .setTitle("✅ Sanktion bezahlt")
            .setDescription(
              [
                "━━━━━━━━━━━━━━━━━━━━",
                `**Name:** <@${record.targetUserId}>`,
                `**Bezahlt markiert von:** <@${interaction.user.id}>`,
                `**Zeitpunkt:** <t:${unixTimestamp(record.paidAt)}:F>`,
                `**Sanktion-ID:** \`${record.id}\``,
                "━━━━━━━━━━━━━━━━━━━━",
              ].join("\n")
            )
            .setFooter({ text: `${CONFIG.shortName} • Sanktionslog` }),
        ],
      });

      return interaction.reply({
        content: "✅ Sanktion wurde als bezahlt markiert.",
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error("❌ Fehler bei einer Interaction:", {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    const errorMessage =
      "❌ Es ist ein Fehler passiert. Prüfe bitte die Bot-Rechte, Rollen-Reihenfolge und Railway-Logs.";

    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({
        content: errorMessage,
        ephemeral: true,
      }).catch(() => {});
    }

    return interaction.reply({
      content: errorMessage,
      ephemeral: true,
    }).catch(() => {});
  }
});

// =====================================================
// FEHLER ABFANGEN
// =====================================================

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled Rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
});

// =====================================================
// LOGIN
// =====================================================

checkEnv();
client.login(process.env.DISCORD_TOKEN);
