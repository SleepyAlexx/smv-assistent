// =====================================================
// SMV-Assistent | Registrierungspanel
// Sauberes Script für index.js
//
// Funktionen:
// ✅ Bot startet sauber über Railway
// ✅ /registrierpanel erstellt ein schönes Registrierungspanel
// ✅ User klickt auf "Registrieren"
// ✅ User gibt Vorname + Nachname ein
// ✅ Bot setzt automatisch den Nickname: SMV I Vorname Nachname
//
// Wichtig:
// - Bot braucht auf Discord die Berechtigung "Nicknamen verwalten"
// - Die Rolle vom Bot muss über den Rollen der User stehen
// - Der Server-Owner kann nicht umbenannt werden
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

  // So wird der Nickname später aussehen:
  // SMV I Alex Kingsley
  nicknamePrefix: "SMV I",

  // Embed-Farbe
  embedColor: 0x2b2d31,

  // Optional:
  // Wenn du in Railway eine Variable REGISTRATION_CHANNEL_ID einträgst,
  // wird das Panel immer in diesen Channel gesendet.
  // Wenn du keine REGISTRATION_CHANNEL_ID einträgst,
  // wird das Panel in den Channel gesendet, wo du /registrierpanel ausführst.
  registrationChannelId: process.env.REGISTRATION_CHANNEL_ID || null,
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

// Wichtig:
// Wir benutzen hier nur Guilds.
// Dadurch gibt es keinen Fehler wegen "Used disallowed intents".
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
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
// INTERACTIONS
// =====================================================

client.on("interactionCreate", async (interaction) => {
  try {
    // /registrierpanel
    if (interaction.isChatInputCommand() && interaction.commandName === "registrierpanel") {
      const embed = createRegisterPanelEmbed();
      const row = createRegisterButtonRow();

      const targetChannel = CONFIG.registrationChannelId
        ? await client.channels.fetch(CONFIG.registrationChannelId).catch(() => null)
        : interaction.channel;

      if (!targetChannel) {
        return interaction.reply({
          content: "❌ Der Registrierungschannel wurde nicht gefunden. Prüfe die REGISTRATION_CHANNEL_ID.",
          ephemeral: true,
        });
      }

      await targetChannel.send({
        embeds: [embed],
        components: [row],
      });

      return interaction.reply({
        content: "✅ Registrierungspanel wurde erfolgreich gesendet.",
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

      return interaction.reply({
        content: `✅ Du wurdest erfolgreich registriert.\nDein neuer Name ist: **${newNickname}**`,
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error("❌ Fehler bei einer Interaction:", error);

    const errorMessage =
      "❌ Es ist ein Fehler passiert. Prüfe bitte, ob der Bot **Nicknamen verwalten** darf und seine Rolle über der Rolle des Users steht.";

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
