// =====================================================
// SMV-Assistent | Registrierung + Rollen + Join/Leave + Aufstellung
// Komplettes Script für index.js
//
// Funktionen:
// ✅ Registrierungspanel mit Button + Modal
// ✅ Nickname automatisch: SMV I Vorname Nachname
// ✅ Rollen nach Registrierung automatisch vergeben
// ✅ Join-Nachricht automatisch
// ✅ Leave-Nachricht automatisch
// ✅ Automatische Aufstellung Dienstag - Sonntag um 00:00 Uhr
// ✅ Montag kommt nichts
// ✅ Dienstag - Samstag = Tagesaufstellung
// ✅ Sonntag = Pflichtaufstellung
// ✅ Buttons: ✅ Anwesend | ❌ Abwesend | ⏳ Ungewiss
// ✅ User kann Auswahl ändern und wird aus alter Kategorie entfernt
// ✅ Sicherheitsprüfung: Falls Bot um 00:00 kurz offline war, wird die Aufstellung nachträglich erstellt
//
// WICHTIG:
// Für Join/Leave und Rollenvergabe brauchst du den Server Members Intent.
//
// Discord Developer Portal:
// 1. Application öffnen
// 2. Links auf "Bot"
// 3. Runterscrollen zu "Privileged Gateway Intents"
// 4. "Server Members Intent" aktivieren
// 5. Speichern
//
// Bot-Rechte auf Discord:
// - Administrator reicht grundsätzlich
// - Bot-Rolle muss über den Rollen stehen, die er vergeben soll
// - Bot-Rolle muss über den User-Rollen stehen, damit Nicknamen geändert werden können
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
} = require("discord.js");

// =====================================================
// EINSTELLUNGEN
// =====================================================

const CONFIG = {
  botName: "SMV-Assistent",
  familyName: "Sedoij Medved",
  shortName: "SMV",

  // Nickname-Format:
  // SMV I Alex Kingsley
  nicknamePrefix: "SMV I",

  // Farben
  embedColor: 0x2b2d31,

  // Channel IDs
  welcomeChannelId: "1434318022683922543",
  registrationChannelId: "1508266444390010890",
  leaveChannelId: "1451317175900962898",

  // Aufstellungs-Channel
  lineupChannelId: "1451318638601830550",

  // Rollen, die nach der Registrierung automatisch vergeben werden
  registeredRoleIds: [
    "1451314176004984912",
    "1434318021412786308",
  ],

  // Aufstellung
  timezone: "Europe/Berlin",
  lineupStartTimeText: "20:30 - 21:00",
  lineupEventStartText: "jeden Tag um 20:30 Uhr",
};

// =====================================================
// SPEICHERDATEI
// =====================================================

const DATA_DIR = path.join(__dirname, "data");
const LINEUP_DATA_FILE = path.join(DATA_DIR, "lineups.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(LINEUP_DATA_FILE)) {
    fs.writeFileSync(LINEUP_DATA_FILE, JSON.stringify({ postedDates: {}, lineups: {} }, null, 2));
  }
}

function loadLineupData() {
  ensureDataFile();

  try {
    return JSON.parse(fs.readFileSync(LINEUP_DATA_FILE, "utf8"));
  } catch (error) {
    console.error("❌ lineups.json konnte nicht gelesen werden:", error);
    return { postedDates: {}, lineups: {} };
  }
}

function saveLineupData(data) {
  ensureDataFile();
  fs.writeFileSync(LINEUP_DATA_FILE, JSON.stringify(data, null, 2));
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

// GuildMembers brauchst du für Join/Leave und Rollen.
// Dafür muss im Developer Portal "Server Members Intent" aktiviert sein.
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

function isLineupDay(weekday) {
  // Montag keine Aufstellung
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

function getUserDisplayName(member, userId) {
  if (member?.displayName) return member.displayName;
  return `<@${userId}>`;
}

function getUsersByStatus(lineup, status) {
  return Object.entries(lineup.users)
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

  const data = loadLineupData();

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
  saveLineupData(data);

  console.log(`✅ ${lineup.title} für ${now.dateText} wurde erstellt. Grund: ${reason}`);
}

async function checkDailyLineup() {
  const now = getBerlinParts();

  // Montag nichts
  if (!isLineupDay(now.weekday)) {
    return;
  }

  const data = loadLineupData();

  // Keine doppelte Aufstellung am selben Tag
  if (data.postedDates[now.dateKey]) {
    return;
  }

  // Sicherheitslogik:
  // Der Bot prüft regelmäßig. Sobald ein Aufstellungstag erreicht ist und noch nichts gepostet wurde,
  // erstellt er die Aufstellung. Dadurch wird sie auch nachgeholt, falls Railway um 00:00 kurz offline war.
  await createLineupForToday("auto-check");
}

function startLineupScheduler() {
  // Direkt beim Bot-Start prüfen.
  checkDailyLineup().catch((error) => {
    console.error("❌ Fehler bei erster Aufstellungsprüfung:", error);
  });

  // Danach jede Minute prüfen.
  setInterval(() => {
    checkDailyLineup().catch((error) => {
      console.error("❌ Fehler bei Aufstellungsprüfung:", error);
    });
  }, 60 * 1000);

  console.log("✅ Aufstellungs-Scheduler wurde gestartet.");
}

// =====================================================
// SLASH COMMANDS REGISTRIEREN
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
      .setDescription("Erstellt manuell eine Aufstellung für heute")
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

  startLineupScheduler();
});

// =====================================================
// AUTOMATISCHE JOIN NACHRICHT
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

// =====================================================
// AUTOMATISCHE LEAVE NACHRICHT
// =====================================================

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
    // /registrierpanel
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

    // /aufstellung-test
    if (interaction.isChatInputCommand() && interaction.commandName === "aufstellung-test") {
      await interaction.reply({
        content: "✅ Test wird ausgeführt. Ich prüfe, ob für heute eine Aufstellung erstellt werden soll.",
        ephemeral: true,
      });

      await createLineupForToday("manual-test");
      return;
    }

    // Button: Registrieren
    if (interaction.isButton() && interaction.customId === "smv_register_button") {
      return interaction.showModal(createRegisterModal());
    }

    // Buttons: Aufstellung
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

      const data = loadLineupData();
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
        name: getUserDisplayName(member, userId),
        updatedAt: new Date().toISOString(),
      };

      data.lineups[dateKey] = lineup;
      saveLineupData(data);

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

    // Modal: Registrierung abschicken
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
  } catch (error) {
    console.error("❌ Fehler bei einer Interaction:", error);

    const errorMessage =
      "❌ Es ist ein Fehler passiert. Prüfe bitte die Bot-Rechte und die Rollen-Reihenfolge.";

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
