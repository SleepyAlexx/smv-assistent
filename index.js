// =====================================================
// SMV-Assistent | Komplettscript
// Registrierung + Join/Leave + Aufstellung + Leaderpanel/Sanktionen
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
// Leader/Sanktionsrechte:
// Nur User mit einer dieser Rollen dürfen Sanktionen erstellen/bezahlt markieren:
// 1451315550394515516
// 1434318021412786317
// =====================================================

require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
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

  // Rollen, die nach Registrierung automatisch vergeben werden
  registeredRoleIds: [
    "1451314176004984912",
    "1434318021412786308",
  ],

  // Nur diese Rollen dürfen Leaderpanel/Sanktionen nutzen
  leaderRoleIds: [
    "1451315550394515516",
    "1434318021412786317",
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

function formatMoney(amount) {
  return `${Number(amount || 0).toLocaleString("de-DE")}$`;
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
// REGISTRIERUNG
// =====================================================

async function addRegisteredRoles(member) {
  const addedRoles = [];
  const failedRoles = [];

  for (const roleId of CONFIG.registeredRoleIds) {
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

function createEmptyLineup(dateKey, dateText, weekday) {
  return {
    dateKey,
    dateText,
    weekday,
    title: getLineupTitle(weekday),
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

function formatUserList(users, emoji) {
  if (users.length === 0) return "—";

  return users
    .map((user) => `${emoji} ${user.name}`)
    .join("\n")
    .slice(0, 1000);
}

function createLineupEmbed(lineup) {
  const presentUsers = getUsersByStatus(lineup, "present");
  const absentUsers = getUsersByStatus(lineup, "absent");
  const unsureUsers = getUsersByStatus(lineup, "unsure");
  const total = presentUsers.length + absentUsers.length + unsureUsers.length;

  return new EmbedBuilder()
    .setColor(CONFIG.embedColor)
    .setTitle(lineup.title)
    .setDescription(
      [
        "**Event Info:**",
        `📅 ${lineup.dateText}`,
        `🕘 ${CONFIG.lineupStartTimeText}`,
        "",
        "**Description:**",
        "✅ Ihr schafft es pünktlich zur Aufstellung zu kommen.",
        "❌ Ihr schafft es nicht zur Aufstellung zu kommen.",
        "⏳ Ihr schafft es in der angegebenen Zeit zur Aufstellung.",
      ].join("\n")
    )
    .addFields(
      {
        name: `✅ Anwesend (${presentUsers.length})`,
        value: formatUserList(presentUsers, "✅"),
        inline: true,
      },
      {
        name: `❌ Abwesend (${absentUsers.length})`,
        value: formatUserList(absentUsers, "❌"),
        inline: true,
      },
      {
        name: `⏳ Ungewiss (${unsureUsers.length})`,
        value: formatUserList(unsureUsers, "⏳"),
        inline: true,
      },
      {
        name: "Info",
        value: [
          `Sign ups: Total: **${total}**`,
          `Event start time: **${CONFIG.lineupEventStartText}**`,
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
  const unsureUsers = getUsersByStatus(lineup, "unsure");

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lineup_present_${lineup.dateKey}`)
      .setLabel(`${presentUsers.length}`)
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`lineup_absent_${lineup.dateKey}`)
      .setLabel(`${absentUsers.length}`)
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId(`lineup_unsure_${lineup.dateKey}`)
      .setLabel(`${unsureUsers.length}`)
      .setEmoji("⏳")
      .setStyle(ButtonStyle.Primary)
  );
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
    components: [createLineupButtons(lineup)],
  });
}

async function createLineupForToday(reason = "scheduled") {
  const now = getBerlinParts();

  if (!isLineupDay(now.weekday)) {
    console.log(`ℹ️ Heute ist ${now.weekday}. Keine Aufstellung.`);
    return;
  }

  const data = loadData();

  if (data.postedDates[now.dateKey]) {
    console.log(`ℹ️ Aufstellung für ${now.dateKey} wurde bereits erstellt.`);
    return;
  }

  const lineup = createEmptyLineup(now.dateKey, now.dateText, now.weekday);

  const message = await sendToChannel(CONFIG.lineupChannelId, {
    embeds: [createLineupEmbed(lineup)],
    components: [createLineupButtons(lineup)],
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

  const data = loadData();
  if (data.postedDates[now.dateKey]) return;

  await createLineupForToday("auto-check");
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
      .setStyle(ButtonStyle.Danger)
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

  const statusText = record.paid
    ? `✅ Bezahlt von <@${record.paidBy}> am <t:${unixTimestamp(record.paidAt)}:F>`
    : Date.now() >= record.dueAt
      ? "⚠️ Überfällig"
      : "⏳ Offen";

  return new EmbedBuilder()
    .setColor(record.paid ? CONFIG.successColor : Date.now() >= record.dueAt ? CONFIG.dangerColor : CONFIG.warningColor)
    .setTitle("⚠️ Verwarnung ⚠️")
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
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sanction_paid_${record.id}`)
      .setLabel(record.paid ? "Bereits bezahlt" : "Bezahlt markieren")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(Boolean(record.paid))
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
    content: [
      "⚠️ **Neue Sanktion erstellt**",
      `Name: <@${record.targetUserId}>`,
      `Zu Bezahlen: **${record.total > 0 ? formatMoney(record.total) : "Keine feste Geldsumme"}**`,
      `Frist: <t:${unixTimestamp(record.dueAt)}:F> (<t:${unixTimestamp(record.dueAt)}:R>)`,
      `Ausgestellt von: <@${record.leaderId}>`,
    ].join("\n"),
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
    if (record.warnedOverdue) continue;
    if (Date.now() < record.dueAt) continue;

    record.warnedOverdue = true;
    changed = true;

    await sendToChannel(CONFIG.sanctionLogChannelId, {
      content: [
        "🚨 **Sanktion überfällig**",
        `Name: <@${record.targetUserId}>`,
        `Zu Bezahlen: **${record.total > 0 ? formatMoney(record.total) : "Keine feste Geldsumme"}**`,
        `Frist war: <t:${unixTimestamp(record.dueAt)}:F> (<t:${unixTimestamp(record.dueAt)}:R>)`,
        `Ausgestellt von: <@${record.leaderId}>`,
        `Sanktion-ID: \`${record.id}\``,
      ].join("\n"),
    });

    await updateSanctionMessage(record).catch(() => {});
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

  // Jede Minute prüfen.
  setInterval(() => {
    checkDailyLineup().catch((error) => {
      console.error("❌ Fehler bei Aufstellungsprüfung:", error);
    });

    checkOverdueSanctions().catch((error) => {
      console.error("❌ Fehler bei Sanktionsprüfung:", error);
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
      .setName("leaderpanel")
      .setDescription("Sendet das SMV Leaderpanel")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
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

  try {
    await registerCommands();
  } catch (error) {
    console.error("❌ Fehler beim Registrieren der Slash Commands:", error);
  }

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

    console.log(`✅ Willkommensnachricht gesendet für ${member.user.tag}`);
  } catch (error) {
    console.error("❌ Fehler bei guildMemberAdd:", error);
  }
});

client.on("guildMemberRemove", async (member) => {
  try {
    const message = `Poka, ${member.user.tag}!`;

    await sendToChannel(CONFIG.leaveChannelId, {
      content: message,
    });

    console.log(`✅ Leave-Nachricht gesendet für ${member.user.tag}`);
  } catch (error) {
    console.error("❌ Fehler bei guildMemberRemove:", error);
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

    // -------------------------------
    // Registrierung
    // -------------------------------

    if (interaction.isButton() && interaction.customId === "smv_register_button") {
      return interaction.showModal(createRegisterModal());
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

    if (interaction.isButton() && interaction.customId.startsWith("lineup_")) {
      const parts = interaction.customId.split("_");
      const action = parts[1];
      const dateKey = parts.slice(2).join("_");

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
      const lineup = data.lineups[dateKey];

      if (!lineup) {
        return interaction.reply({
          content: "❌ Diese Aufstellung wurde nicht im Speicher gefunden. Bitte melde dich beim Team.",
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
        unsure: "Ungewiss",
      }[selectedStatus];

      return interaction.reply({
        content: `✅ Deine Auswahl wurde gespeichert: **${statusText}**`,
        ephemeral: true,
      });
    }

    // -------------------------------
    // Leaderpanel / Sanktionen
    // -------------------------------

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

      draft.selectedByMenu[group] = interaction.values;
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

      record.paid = true;
      record.paidAt = Date.now();
      record.paidBy = interaction.user.id;

      data.sanctions[sanctionId] = record;
      saveData(data);

      await updateSanctionMessage(record);

      await sendToChannel(CONFIG.sanctionLogChannelId, {
        content: [
          "✅ **Sanktion bezahlt**",
          `Name: <@${record.targetUserId}>`,
          `Bezahlt markiert von: <@${interaction.user.id}>`,
          `Zeitpunkt: <t:${unixTimestamp(record.paidAt)}:F>`,
          `Sanktion-ID: \`${record.id}\``,
        ].join("\n"),
      });

      return interaction.reply({
        content: "✅ Sanktion wurde als bezahlt markiert.",
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error("❌ Fehler bei einer Interaction:", error);

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
