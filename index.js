// ===============================
// SMV-Assistent | Registrierungspanel
// Funktion:
// - /registrierpanel sendet ein schönes Registrierungs-Panel
// - User klickt auf "Registrieren"
// - User gibt Vorname + Nachname ein
// - Bot setzt automatisch den Nickname: SMV I Vorname Nachname
// ===============================

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

// ===============================
// EINSTELLUNGEN
// ===============================

const CONFIG = {
  botName: "SMV-Assistent",
  familyName: "Sedoij Medved",
  shortName: "SMV",
  nicknamePrefix: "SMV I",
  embedColor: 0x2b2d31,

  // Optional:
  // Wenn REGISTRATION_CHANNEL_ID in Railway/.env eingetragen ist,
  // sendet /registrierpanel das Panel automatisch in diesen Channel.
  // Wenn nicht, wird es in den aktuellen Channel gesendet.
  registrationChannelId: process.env.REGISTRATION_CHANNEL_ID || null,
};

// ===============================
// CLIENT
// ===============================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// ===============================
// HILFSFUNKTIONEN
// ===============================

function cleanName(input) {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function createRegisterPanelEmbed() {
  return new EmbedBuilder()
    .setColor(CONFIG.embedColor)
    .setTitle("👤 • REGISTRIERUNGSPANEL")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━━━",
        `Willkommen bei der Familie **${CONFIG.familyName}**.`,
        "",
        "**📝 Registrierung**",
        "└ Trage deinen **Vor- und Nachnamen** ein.",
        "",
        "**🏷️ Nickname**",
        `└ Dein Name wird automatisch zu **${CONFIG.nicknamePrefix} Vorname Nachname** geändert.`,
        "",
        "**✅ Beispiel**",
        `└ **${CONFIG.nicknamePrefix} Alex Kingsley**`,
        "",
        "━━━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setFooter({
      text: `${CONFIG.shortName} • Registrierung • ${new Date().toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
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

// ===============================
// SLASH COMMAND REGISTRIEREN
// ===============================

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

  console.log("✅ Slash Commands wurden registriert.");
}

// ===============================
// BOT START
// ===============================

client.once("clientReady", async () => {
  console.log(`✅ ${CONFIG.botName} ist online als ${client.user.tag}`);

  try {
    await registerCommands();
  } catch (error) {
    console.error("❌ Fehler beim Registrieren der Slash Commands:", error);
  }
});

// ===============================
// INTERACTIONS
// ===============================

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
      "❌ Es ist ein Fehler passiert. Prüfe, ob der Bot die Berechtigung **Nicknamen verwalten** hat und seine Rolle über der User-Rolle steht.";

    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({ content: errorMessage, ephemeral: true }).catch(() => {});
    }

    return interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => {});
  }
});

// ===============================
// FEHLER ABFANGEN
// ===============================

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled Rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
});

// ===============================
// LOGIN
// ===============================

client.login(process.env.DISCORD_TOKEN);
