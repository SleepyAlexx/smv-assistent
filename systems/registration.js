const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const CONFIG = require("../config");

const { cleanName, getReadableUserName } = require("../utils/format");
const { getGermanDateTime } = require("../utils/dates");
const { hasLeaderPermission } = require("../utils/permissions");
const { sendToChannel, safeReply } = require("../utils/discord");

// =====================================================
// SLASH COMMAND
// =====================================================

const registrationPanelCommand = new SlashCommandBuilder()
  .setName("registrierungspanel")
  .setDescription("Sendet das SMV-Registrierungspanel.");

// =====================================================
// ROLLEN
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

  return {
    addedRoles,
    failedRoles,
  };
}

// =====================================================
// REGISTRIERUNGSPANEL
// =====================================================

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
    .setPlaceholder("z. B. Max")
    .setStyle(TextInputStyle.Short)
    .setMinLength(2)
    .setMaxLength(20)
    .setRequired(true);

  const lastNameInput = new TextInputBuilder()
    .setCustomId("last_name")
    .setLabel("Nachname")
    .setPlaceholder("z. B. Mustermann")
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
// PANEL SENDEN
// =====================================================

async function sendRegistrationPanel(client, interaction) {
  if (!hasLeaderPermission(interaction.member)) {
    return safeReply(interaction, {
      content: "❌ Du hast keine Berechtigung, das Registrierungspanel zu senden.",
      ephemeral: true,
    });
  }

  const message = await sendToChannel(client, CONFIG.registrationChannelId, {
    embeds: [createRegisterPanelEmbed()],
    components: [createRegisterButtonRow()],
  });

  if (!message) {
    return safeReply(interaction, {
      content: "❌ Registrierungspanel konnte nicht gesendet werden. Bitte prüfe Channel-ID und Bot-Rechte.",
      ephemeral: true,
    });
  }

  return safeReply(interaction, {
    content: `✅ Registrierungspanel wurde in <#${CONFIG.registrationChannelId}> gesendet.`,
    ephemeral: true,
  });
}

// =====================================================
// REGISTRIERUNG ABSCHICKEN
// =====================================================

async function submitRegistration(interaction) {
  const firstName = cleanName(interaction.fields.getTextInputValue("first_name"));
  const lastName = cleanName(interaction.fields.getTextInputValue("last_name"));

  if (!firstName || !lastName) {
    return safeReply(interaction, {
      content: "❌ Bitte gib einen gültigen Vor- und Nachnamen ein.",
      ephemeral: true,
    });
  }

  const fullName = `${firstName} ${lastName}`;
  const newNickname = `${CONFIG.nicknamePrefix} ${fullName}`;

  const member = interaction.member;

  let nicknameChanged = false;
  let nicknameError = null;

  try {
    await member.setNickname(newNickname, "SMV Registrierung");
    nicknameChanged = true;
  } catch (error) {
    nicknameError = error;
    console.error("❌ Nickname konnte nicht geändert werden:", error);
  }

  const { addedRoles, failedRoles } = await addRegisteredRoles(member);

  const description = [
    "✅ **Registrierung abgeschlossen.**",
    "",
    `👤 **Name:** ${fullName}`,
    `🏷️ **Nickname:** ${nicknameChanged ? newNickname : "Konnte nicht gesetzt werden"}`,
    "",
    addedRoles.length
      ? `✅ **Rollen vergeben:** ${addedRoles.join(", ")}`
      : "⚠️ **Rollen vergeben:** Keine",
    failedRoles.length
      ? `❌ **Fehlgeschlagene Rollen:** ${failedRoles.join(", ")}`
      : null,
    nicknameError
      ? "⚠️ Der Nickname konnte nicht gesetzt werden. Bitte prüfe, ob die Bot-Rolle hoch genug ist."
      : null,
  ].filter(Boolean).join("\n");

  return safeReply(interaction, {
    content: description,
    ephemeral: true,
  });
}

// =====================================================
// JOIN / LEAVE NACHRICHTEN
// =====================================================

async function sendWelcomeMessage(client, member) {
  const name = getReadableUserName(member, member.user);

  await sendToChannel(client, CONFIG.welcomeChannelId, {
    embeds: [
      new EmbedBuilder()
        .setColor(CONFIG.successColor)
        .setTitle("👋 Willkommen")
        .setDescription(
          [
            "━━━━━━━━━━━━━━━━━━━━",
            `Willkommen bei **${CONFIG.familyName}**, **${name}**.`,
            "",
            `Bitte registriere dich in <#${CONFIG.registrationChannelId}>.`,
            "━━━━━━━━━━━━━━━━━━━━",
          ].join("\n")
        )
        .setFooter({
          text: `${CONFIG.shortName} • Willkommen • ${getGermanDateTime()}`,
        }),
    ],
  });
}

async function sendLeaveMessage(client, member) {
  const name = getReadableUserName(member, member.user);

  await sendToChannel(client, CONFIG.leaveChannelId, {
    embeds: [
      new EmbedBuilder()
        .setColor(CONFIG.dangerColor)
        .setTitle("🚪 Mitglied verlassen")
        .setDescription(
          [
            "━━━━━━━━━━━━━━━━━━━━",
            `Poka, **${name}**!`,
            "",
            "Ein Mitglied hat den Server verlassen.",
            "━━━━━━━━━━━━━━━━━━━━",
          ].join("\n")
        )
        .setFooter({
          text: `${CONFIG.shortName} • Leave • ${getGermanDateTime()}`,
        }),
    ],
    allowedMentions: { parse: [] },
  });
}

// =====================================================
// INTERACTIONS
// =====================================================

async function handleRegistrationCommand(client, interaction) {
  if (!interaction.isChatInputCommand()) return false;
  if (interaction.commandName !== "registrierungspanel") return false;

  await sendRegistrationPanel(client, interaction);
  return true;
}

async function handleRegistrationButton(client, interaction) {
  if (!interaction.isButton()) return false;
  if (interaction.customId !== "smv_register_button") return false;

  await interaction.showModal(createRegisterModal());
  return true;
}

async function handleRegistrationModal(client, interaction) {
  if (!interaction.isModalSubmit()) return false;
  if (interaction.customId !== "smv_register_modal") return false;

  await submitRegistration(interaction);
  return true;
}

async function handleRegistrationInteraction(client, interaction) {
  if (await handleRegistrationCommand(client, interaction)) return true;
  if (await handleRegistrationButton(client, interaction)) return true;
  if (await handleRegistrationModal(client, interaction)) return true;

  return false;
}

module.exports = {
  registrationPanelCommand,
  createRegisterPanelEmbed,
  createRegisterButtonRow,
  handleRegistrationInteraction,
  sendWelcomeMessage,
  sendLeaveMessage,
};
