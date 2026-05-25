// =====================================================
// SMV-Assistent | Registrierung + Rollen + Join/Leave
// Komplettes Script für index.js
//
// Funktionen:
// ✅ Bot startet sauber über Railway
// ✅ /registrierpanel erstellt ein schönes Registrierungspanel
// ✅ User klickt auf "Registrieren"
// ✅ User gibt Vorname + Nachname ein
// ✅ Bot setzt automatisch den Nickname: SMV I Vorname Nachname
// ✅ User bekommt nach Registrierung automatisch Rollen
// ✅ Automatische Willkommensnachricht, wenn ein User joint
// ✅ Automatische Leave-Nachricht, wenn ein User leavt
//
// WICHTIG FÜR JOIN/LEAVE:
// Für guildMemberAdd und guildMemberRemove brauchst du den Server Members Intent.
//
// Discord Developer Portal:
// 1. Application öffnen
// 2. Links auf "Bot"
// 3. Runterscrollen zu "Privileged Gateway Intents"
// 4. "Server Members Intent" aktivieren
// 5. Speichern
//
// WICHTIG FÜR ROLLEN:
// - Bot braucht "Rollen verwalten"
// - Bot-Rolle muss über den Rollen stehen, die er vergeben soll
// =====================================================

require("dotenv").config();

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

  // Rollen, die nach der Registrierung automatisch vergeben werden
  registeredRoleIds: [
    "1451314176004984912",
    "1434318021412786308",
  ],
};

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

// Für automatische Join/Leave Nachrichten brauchen wir GuildMembers.
// Dafür muss im Discord Developer Portal der "Server Members Intent" aktiviert sein.
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// =====================================================
// HILFSFUNKTIONEN
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
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function sendToChannel(channelId, payload) {
  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel) {
    console.error(`❌ Channel nicht gefunden: ${channelId}`);
    return false;
  }

  await channel.send(payload);
  return true;
}

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
// SLASH COMMANDS REGISTRIEREN
// =====================================================

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("registrierpanel")
      .setDescription("Sendet das SMV Registrierungspanel")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );

  console.log("✅ Slash Command /registrierpanel wurde registriert.");
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

    // Button: Registrieren
    if (interaction.isButton() && interaction.customId === "smv_register_button") {
      return interaction.showModal(createRegisterModal());
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
        replyMessage += `\n\n✅ Rollen wurden vergeben.`;
      }

      if (failedRoles.length > 0) {
        replyMessage += `\n\n⚠️ Einige Rollen konnten nicht vergeben werden. Bitte melde dich beim Team.`;
      }

      return interaction.reply({
        content: replyMessage,
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error("❌ Fehler bei einer Interaction:", error);

    const errorMessage =
      "❌ Es ist ein Fehler passiert. Prüfe bitte, ob der Bot **Nicknamen verwalten** und **Rollen verwalten** darf. Die Bot-Rolle muss über der User-Rolle und über den zu vergebenden Rollen stehen.";

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
