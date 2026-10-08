const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const CONFIG = require("../config");
const { getGermanDateTime } = require("../utils/dates");
const { hasLeaderPermission } = require("../utils/permissions");
const { sendToChannel, safeReply } = require("../utils/discord");

// =====================================================
// SLASH COMMAND
// =====================================================

const familyPanelCommand = new SlashCommandBuilder()
  .setName("familienpanel")
  .setDescription("Sendet das SMV-Familienpanel.");

// =====================================================
// EMBED / BUTTONS
// =====================================================

function createFamilyPanelEmbed() {
  return new EmbedBuilder()
    .setColor(CONFIG.embedColor)
    .setTitle("🐻 • SMV FAMILIENPANEL")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━━━",
        "Abmeldungen, Fußball-Events und Wochenabgaben verwalten.",
        "━━━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setFooter({
      text: `${CONFIG.shortName} • Familienpanel • ${getGermanDateTime()}`,
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
      .setCustomId("family_football")
      .setLabel("Fußball")
      .setEmoji("⚽")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("family_weekly_payment")
      .setLabel("Wochenabgabe")
      .setEmoji("💸")
      .setStyle(ButtonStyle.Secondary)
  );
}

// =====================================================
// PANEL SENDEN
// =====================================================

async function sendFamilyPanel(client, interaction) {
  if (!hasLeaderPermission(interaction.member)) {
    return safeReply(interaction, {
      content: "❌ Du hast keine Berechtigung, das Familienpanel zu senden.",
      ephemeral: true,
    });
  }

  const familyPanelChannelId = CONFIG.familyPanelChannelId || CONFIG.absenceChannelId;

  const message = await sendToChannel(client, familyPanelChannelId, {
    embeds: [createFamilyPanelEmbed()],
    components: [createFamilyPanelButtons()],
  });

  if (!message) {
    return safeReply(interaction, {
      content: "❌ Familienpanel konnte nicht gesendet werden. Bitte prüfe Channel-ID und Bot-Rechte.",
      ephemeral: true,
    });
  }

  return safeReply(interaction, {
    content: `✅ Familienpanel wurde in <#${familyPanelChannelId}> gesendet.`,
    ephemeral: true,
  });
}

// =====================================================
// INTERACTIONS
// =====================================================

async function handleFamilyPanelCommand(client, interaction) {
  if (!interaction.isChatInputCommand()) return false;
  if (interaction.commandName !== "familienpanel") return false;

  await sendFamilyPanel(client, interaction);
  return true;
}

async function handleFamilyPanelInteraction(client, interaction) {
  if (await handleFamilyPanelCommand(client, interaction)) return true;
  return false;
}

module.exports = {
  familyPanelCommand,
  createFamilyPanelEmbed,
  createFamilyPanelButtons,
  handleFamilyPanelInteraction,
};
