const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const CONFIG = require("../config");
const { loadData, saveData } = require("../utils/dataStore");
const { hasLeaderPermission } = require("../utils/permissions");
const { sendToChannel, safeReply } = require("../utils/discord");

// =====================================================
// SLASH COMMAND
// =====================================================

const leaderPanelCommand = new SlashCommandBuilder()
  .setName("leaderpanel")
  .setDescription("Sendet das SMV-Leaderpanel.");

// =====================================================
// DRAFTS
// =====================================================

const sanctionDrafts = new Map();

// =====================================================
// SANKTIONSKATALOG
// =====================================================

const SANCTION_CATEGORIES = [
  {
    id: "allgemein",
    label: "Allgemeine Verstöße",
    emoji: "💵",
  },
  {
    id: "intern",
    label: "Internes Verhalten",
    emoji: "👑",
  },
  {
    id: "aufstellung",
    label: "Aufstellung & Anwesenheit",
    emoji: "👥",
  },
  {
    id: "extern",
    label: "Externes Verhalten",
    emoji: "🤝",
  },
  {
    id: "kommunikation",
    label: "Kommunikation",
    emoji: "📻",
  },
  {
    id: "hausordnung",
    label: "Hausordnung",
    emoji: "🏠",
  },
];

const SANCTION_CATALOG = [
  // I. ALLGEMEINE VERSTÖSSE
  {
    id: "weitergabe_infos",
    categoryId: "allgemein",
    label: "Weitergabe familieninterner Informationen oder Ausrüstung",
    note: "Schwere abhängig von Bedeutung/Gewicht der Informationen",
  },
  {
    id: "wochenabgabe_nicht_bezahlt",
    categoryId: "allgemein",
    label: "Wochenabgabe nicht bezahlt",
    note: "Nachzahlung berücksichtigen",
  },
  {
    id: "sanktion_nicht_bezahlt",
    categoryId: "allgemein",
    label: "Sanktion nicht bezahlt",
    note: "Nachzahlung der Sanktion berücksichtigen",
  },
  {
    id: "kein_mindestbestand",
    categoryId: "allgemein",
    label: "Kein Mindestbestand",
  },
  {
    id: "fahrzeuge_abgeschlossen",
    categoryId: "allgemein",
    label: "Familienfahrzeuge bei Familienaktionen oder auf Route abgeschlossen",
  },
  {
    id: "langwaffe_verloren",
    categoryId: "allgemein",
    label: "Verlust einer Langwaffe durch Eigenverschulden",
    note: "Wert der Waffe berücksichtigen",
  },

  // II. INTERNES VERHALTEN
  {
    id: "anordnungen_ignoriert",
    categoryId: "intern",
    label: "Ignorieren von Anordnungen der Leaderschaft oder Hochrangigen",
    note: "Bis BLOODOUT möglich",
  },
  {
    id: "respektlos_leaderschaft",
    categoryId: "intern",
    label: "Respektloses Verhalten gegenüber Leaderschaft / Höherrangigen",
  },
  {
    id: "beleidigung_intern",
    categoryId: "intern",
    label: "Beleidigungen innerhalb der Familie, die zu weit gehen",
  },
  {
    id: "nicht_aufhoeren",
    categoryId: "intern",
    label: "Trotz mehrfacher Aufforderung nicht aufhören",
  },
  {
    id: "provokation_ragebaiting",
    categoryId: "intern",
    label: "Starke Provokation und Rage-Baiting",
  },
  {
    id: "familie_laecherlich",
    categoryId: "intern",
    label: "Die Familie lächerlich dastehen lassen",
    note: "BLOODOUT möglich",
  },
  {
    id: "schiessen_familienmitglied",
    categoryId: "intern",
    label: "Schießen auf Familienmitglieder",
  },
  {
    id: "toeten_familienmitglied",
    categoryId: "intern",
    label: "Töten eines Familienmitglieds",
    note: "BLOODOUT möglich",
  },

  // III. AUFSTELLUNG & ANWESENHEIT
  {
    id: "nicht_abmelden",
    categoryId: "aufstellung",
    label: "Nicht-Abmelden bei einer Aufstellung",
  },
  {
    id: "nicht_rechtzeitig_aufstellung",
    categoryId: "aufstellung",
    label: "Nicht rechtzeitig zur Aufstellung am Aufstellungsort sein",
  },

  // IV. EXTERNES VERHALTEN
  {
    id: "beleidigung_extern",
    categoryId: "extern",
    label: "Beleidigungen außerhalb der Familie, die zu weit gehen",
    note: "Entschuldigung bei der betroffenen Familie möglich",
  },
  {
    id: "unangemessenes_benehmen",
    categoryId: "extern",
    label: "Unangebrachtes Benehmen bei wichtigen Meetings / Besprechungen",
  },
  {
    id: "stress_extern",
    categoryId: "extern",
    label: "Stress außerhalb der Familie provozieren",
    note: "Bis BLOODOUT möglich",
  },
  {
    id: "zivi_action",
    categoryId: "extern",
    label: "Zivi-Action fällt auf die Familie zurück",
    note: "Bis BLOODOUT möglich",
  },

  // V. KOMMUNIKATION
  {
    id: "funkpflicht_missachtet",
    categoryId: "kommunikation",
    label: "Funkpflicht missachtet",
  },
  {
    id: "funkdisziplin_missachtet",
    categoryId: "kommunikation",
    label: "Funkdisziplin missachtet",
  },
  {
    id: "kein_gps_tracker",
    categoryId: "kommunikation",
    label: "Keinen GPS-Tracker bei sich tragen",
  },

  // VI. HAUSORDNUNG
  {
    id: "tueren_tore_nicht_abgeschlossen",
    categoryId: "hausordnung",
    label: "Nicht abschließen der Türen / Tore",
  },
  {
    id: "zu_schnell_anwesen",
    categoryId: "hausordnung",
    label: "Zu schnelles Fahren im Anwesen (> 100)",
  },
];

// =====================================================
// HELPER
// =====================================================

function formatMetal(amount) {
  return `${Number(amount || 0).toLocaleString("de-DE")}x Metall`;
}

function parseMetal(input) {
  const cleaned = String(input || "")
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/[^\d]/g, "");

  const amount = Number(cleaned);

  if (!Number.isInteger(amount) || amount < 0) return null;
  return amount;
}

function createShortSanctionId() {
  return `smv${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function getUnixTimestamp(ms) {
  return Math.floor(Number(ms || Date.now()) / 1000);
}

function getDueAt() {
  const days = Number(CONFIG.sanctionDueDays || 7);
  return Date.now() + days * 24 * 60 * 60 * 1000;
}

function getCatalogItem(itemId) {
  return SANCTION_CATALOG.find((item) => item.id === itemId) || null;
}

function getCategory(categoryId) {
  return SANCTION_CATEGORIES.find((category) => category.id === categoryId) || null;
}

function getCatalogItemsByCategory(categoryId) {
  return SANCTION_CATALOG.filter((item) => item.categoryId === categoryId);
}

function getMemberDisplayName(member, user) {
  return member?.displayName || user?.globalName || user?.username || "Unbekannt";
}

function hasAnyRole(member, roleIds = []) {
  if (!member || !member.roles || !member.roles.cache) return false;
  return roleIds.some((roleId) => member.roles.cache.has(roleId));
}

function hasSanctionPermission(member) {
  return (
    hasLeaderPermission(member) ||
    hasAnyRole(member, CONFIG.sanctionCreatorRoleIds || [])
  );
}

function cleanText(input, fallback = "—") {
  const value = String(input || "").trim();
  if (!value) return fallback;
  return value.slice(0, 500);
}

function getDraft(userId) {
  return sanctionDrafts.get(userId) || null;
}

function createNewDraft(userId) {
  const draft = {
    creatorId: userId,
    targetId: null,
    targetName: null,
    items: [],
    createdAt: Date.now(),
  };

  sanctionDrafts.set(userId, draft);
  return draft;
}

function getDraftTotal(draft) {
  return (draft?.items || []).reduce((sum, item) => sum + Number(item.metalAmount || 0), 0);
}

function formatDraftItems(items = []) {
  if (!items.length) {
    return "┖ Noch keine Sanktion ausgewählt";
  }

  return items
    .map((item, index) => {
      const number = index + 1;
      const noteText = item.note ? `\n   └ Zusatz: ${item.note}` : "";

      return [
        `**${number}. ${item.reason}**`,
        `   └ ${formatMetal(item.metalAmount)}${noteText}`,
      ].join("\n");
    })
    .join("\n\n")
    .slice(0, 1000);
}

function formatFinalSanctionItems(items = []) {
  if (!items.length) return "┖ Keine Vergehen eingetragen";

  return items
    .map((item, index) => {
      const number = index + 1;
      const noteText = item.note ? `\n   └ Zusatz: ${item.note}` : "";

      return [
        `**${number}. ${item.reason}**`,
        `   └ ${formatMetal(item.metalAmount)}${noteText}`,
      ].join("\n");
    })
    .join("\n\n")
    .slice(0, 1200);
}

// =====================================================
// LEADERPANEL
// =====================================================

function createLeaderPanelEmbed() {
  return new EmbedBuilder()
    .setColor(CONFIG.embedColor)
    .setTitle("👑 • LEADER CENTER")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━━━",
        "Sanktionen und Wochenabgaben verwalten.",
        "━━━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setFooter({
      text: `${CONFIG.shortName} • Leader Center`,
    });
}

function createLeaderPanelButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("leader_create_sanction")
      .setLabel("Sanktion")
      .setEmoji("⚠️")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("leader_weekly_manage")
      .setLabel("Wochenabgabe")
      .setEmoji("💸")
      .setStyle(ButtonStyle.Primary)
  );
}

async function sendLeaderPanel(client, interaction) {
  if (!hasLeaderPermission(interaction.member)) {
    return safeReply(interaction, {
      content: "❌ Du hast keine Berechtigung, das Leaderpanel zu senden.",
      ephemeral: true,
    });
  }

  const channelId = CONFIG.leaderPanelChannelId || CONFIG.sanctionChannelId;

  const message = await sendToChannel(client, channelId, {
    embeds: [createLeaderPanelEmbed()],
    components: [createLeaderPanelButtons()],
  });

  if (!message) {
    return safeReply(interaction, {
      content: "❌ Leaderpanel konnte nicht gesendet werden. Bitte prüfe Channel-ID und Bot-Rechte.",
      ephemeral: true,
    });
  }

  return safeReply(interaction, {
    content: `✅ Leaderpanel wurde in <#${channelId}> gesendet.`,
    ephemeral: true,
  });
}

// =====================================================
// DRAFT UI
// =====================================================

function createTargetSelectRow() {
  return new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId("sanction_target_select")
      .setPlaceholder("Person auswählen")
      .setMinValues(1)
      .setMaxValues(1)
  );
}

function createDraftEmbed(draft) {
  const personText = draft.targetId
    ? `<@${draft.targetId}>`
    : "Noch nicht ausgewählt";

  const totalMetal = getDraftTotal(draft);

  return new EmbedBuilder()
    .setColor(CONFIG.warningColor)
    .setTitle("⚠️ • SANKTIONSENTWURF")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━━━",
        "",
        "👤 **BETROFFENE PERSON**",
        `┖ ${personText}`,
        "",
        "📋 **AUSGEWÄHLTE VERGEHEN**",
        formatDraftItems(draft.items),
        "",
        "━━━━━━━━━━━━━━━━━━━━",
        "",
        "🪙 **GESAMTABGABE**",
        `┖ **${formatMetal(totalMetal)}**`,
        "",
        "━━━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setFooter({
      text: `${CONFIG.shortName} • Sanktionsentwurf`,
    });
}

function createDraftButtons(draft) {
  const hasTarget = Boolean(draft.targetId);
  const hasItems = draft.items.length > 0;

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("sanction_add_catalog")
        .setLabel("Aus Katalog")
        .setEmoji("📚")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!hasTarget),

      new ButtonBuilder()
        .setCustomId("sanction_add_custom")
        .setLabel("Freier Grund")
        .setEmoji("✍️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!hasTarget),

      new ButtonBuilder()
        .setCustomId("sanction_finish")
        .setLabel("Sanktion posten")
        .setEmoji("✅")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!hasTarget || !hasItems),

      new ButtonBuilder()
        .setCustomId("sanction_abort")
        .setLabel("Abbrechen")
        .setEmoji("❌")
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

function createCategorySelectRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("sanction_category_select")
      .setPlaceholder("Kategorie auswählen")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        SANCTION_CATEGORIES.map((category) => ({
          label: category.label,
          value: category.id,
          emoji: category.emoji,
        }))
      )
  );
}

function createOffenseSelectRow(categoryId) {
  const items = getCatalogItemsByCategory(categoryId).slice(0, 25);
  const category = getCategory(categoryId);

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`sanction_offense_select_${categoryId}`)
      .setPlaceholder(`${category?.label || "Vergehen"} auswählen`)
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        items.map((item) => ({
          label: item.label.slice(0, 100),
          value: item.id,
          description: "Metall-Menge wird danach manuell eingetragen.",
        }))
      )
  );
}

function createCustomSanctionModal() {
  const modal = new ModalBuilder()
    .setCustomId("sanction_custom_modal")
    .setTitle("✍️ Freien Grund hinzufügen");

  const reasonInput = new TextInputBuilder()
    .setCustomId("sanction_reason")
    .setLabel("Grund / Vergehen")
    .setPlaceholder("z. B. Respektloses Verhalten")
    .setStyle(TextInputStyle.Short)
    .setMinLength(2)
    .setMaxLength(100)
    .setRequired(true);

  const metalInput = new TextInputBuilder()
    .setCustomId("sanction_metal")
    .setLabel("Metall-Menge")
    .setPlaceholder("z. B. 500")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(15)
    .setRequired(true);

  const noteInput = new TextInputBuilder()
    .setCustomId("sanction_note")
    .setLabel("Zusatz optional")
    .setPlaceholder("z. B. BLOODOUT, Entschuldigung, leer lassen")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(reasonInput),
    new ActionRowBuilder().addComponents(metalInput),
    new ActionRowBuilder().addComponents(noteInput)
  );

  return modal;
}

function createMetalAmountModal(item) {
  const modal = new ModalBuilder()
    .setCustomId(`sanction_metal_modal_${item.id}`)
    .setTitle("🪙 Metall-Menge festlegen");

  const metalInput = new TextInputBuilder()
    .setCustomId("sanction_metal")
    .setLabel("Metall-Menge")
    .setPlaceholder("z. B. 500")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(15)
    .setRequired(true);

  const noteInput = new TextInputBuilder()
    .setCustomId("sanction_note")
    .setLabel("Zusatz optional")
    .setPlaceholder(item.note || "z. B. BLOODOUT, Entschuldigung, leer lassen")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(metalInput),
    new ActionRowBuilder().addComponents(noteInput)
  );

  return modal;
}

// =====================================================
// SANKTION EMBED
// =====================================================

function getSanctionStatusText(sanction) {
  if (sanction.status === "paid") return "Bezahlt";
  if (sanction.status === "cancelled") return "Storniert";
  if (sanction.status === "overdue") return "Überfällig";
  return "Offen";
}

function getSanctionStatusEmoji(sanction) {
  if (sanction.status === "paid") return "✅";
  if (sanction.status === "cancelled") return "❌";
  if (sanction.status === "overdue") return "⏰";
  return "⚠️";
}

function createSanctionEmbed(sanction) {
  const statusText = getSanctionStatusText(sanction);
  const statusEmoji = getSanctionStatusEmoji(sanction);

  const color =
    sanction.status === "paid"
      ? CONFIG.successColor
      : sanction.status === "cancelled"
        ? CONFIG.dangerColor
        : sanction.status === "overdue"
          ? CONFIG.warningColor
          : CONFIG.embedColor;

  const lines = [
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    "👤 **BETROFFENE PERSON**",
    `┖ <@${sanction.targetId}>`,
    "",
    "👑 **AUSGESTELLT VON**",
    `┖ <@${sanction.creatorId}>`,
    "",
    "📌 **STATUS**",
    `┖ ${statusEmoji} **${statusText}**`,
    "",
    "📋 **VERGEHEN**",
    formatFinalSanctionItems(sanction.items),
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    "🪙 **GESAMTABGABE**",
    `┖ **${formatMetal(sanction.totalMetal)}**`,
    "",
    "⏳ **FRIST**",
    `┖ <t:${getUnixTimestamp(sanction.dueAt)}:R>`,
    "",
    "━━━━━━━━━━━━━━━━━━━━",
  ];

  if (sanction.status === "paid") {
    lines.push("");
    lines.push("✅ **BEZAHLT**");
    lines.push(`┖ Von <@${sanction.paidBy}> am <t:${getUnixTimestamp(sanction.paidAt)}:F>`);
  }

  if (sanction.status === "cancelled") {
    lines.push("");
    lines.push("❌ **STORNIERT**");
    lines.push(`┖ Von <@${sanction.cancelledBy}> am <t:${getUnixTimestamp(sanction.cancelledAt)}:F>`);
  }

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`${statusEmoji} • SMV SANKTION`)
    .setDescription(lines.join("\n"))
    .setFooter({
      text: `${CONFIG.shortName} • Sanktions-ID: ${sanction.id}`,
    });
}

function createSanctionButtons(sanction) {
  const isDone = sanction.status === "paid" || sanction.status === "cancelled";

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sanction_paid_${sanction.id}`)
      .setLabel("Bezahlt")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(isDone),

    new ButtonBuilder()
      .setCustomId(`sanction_cancel_${sanction.id}`)
      .setLabel("Stornieren")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(isDone)
  );
}

// =====================================================
// SANKTION POSTEN / UPDATEN
// =====================================================

async function postSanction(client, interaction, draft) {
  const sanction = {
    id: createShortSanctionId(),
    targetId: draft.targetId,
    targetName: draft.targetName,
    creatorId: draft.creatorId,
    items: draft.items,
    totalMetal: getDraftTotal(draft),
    totalAmount: 0,
    status: "open",
    createdAt: Date.now(),
    dueAt: getDueAt(),
    messageId: null,
    paidBy: null,
    paidAt: null,
    cancelledBy: null,
    cancelledAt: null,
    overdueNotified: false,
  };

  const message = await sendToChannel(client, CONFIG.sanctionChannelId, {
    content: `<@${sanction.targetId}>`,
    embeds: [createSanctionEmbed(sanction)],
    components: [createSanctionButtons(sanction)],
    allowedMentions: {
      users: [sanction.targetId],
    },
  });

  if (!message) {
    return safeReply(interaction, {
      content: "❌ Sanktion konnte nicht gesendet werden. Bitte prüfe Channel-ID und Bot-Rechte.",
      ephemeral: true,
    });
  }

  sanction.messageId = message.id;

  const data = loadData();
  if (!data.sanctions) data.sanctions = {};
  data.sanctions[sanction.id] = sanction;
  saveData(data);

  sanctionDrafts.delete(interaction.user.id);

  return safeReply(interaction, {
    content: `✅ Sanktion wurde in <#${CONFIG.sanctionChannelId}> erstellt.\n🪙 Gesamtabgabe: **${formatMetal(sanction.totalMetal)}**`,
    ephemeral: true,
  });
}

async function updateSanctionMessage(client, sanction) {
  if (!sanction.messageId) return null;

  const channel = await client.channels.fetch(CONFIG.sanctionChannelId).catch(() => null);
  if (!channel || !channel.messages) return null;

  const message = await channel.messages.fetch(sanction.messageId).catch(() => null);
  if (!message) return null;

  await message.edit({
    embeds: [createSanctionEmbed(sanction)],
    components: [createSanctionButtons(sanction)],
  }).catch(() => null);

  return message;
}

// =====================================================
// COMMANDS
// =====================================================

async function handleLeaderPanelCommand(client, interaction) {
  if (!interaction.isChatInputCommand()) return false;
  if (interaction.commandName !== "leaderpanel") return false;

  await sendLeaderPanel(client, interaction);
  return true;
}

// =====================================================
// INTERACTIONS: DRAFT
// =====================================================

async function handleCreateSanctionButton(client, interaction) {
  if (!interaction.isButton()) return false;
  if (interaction.customId !== "leader_create_sanction") return false;

  if (!hasSanctionPermission(interaction.member)) {
    await safeReply(interaction, {
      content: "❌ Du hast keine Berechtigung, Sanktionen zu erstellen.",
      ephemeral: true,
    });
    return true;
  }

  const draft = createNewDraft(interaction.user.id);

  await safeReply(interaction, {
    embeds: [createDraftEmbed(draft)],
    components: [createTargetSelectRow()],
    ephemeral: true,
  });

  return true;
}

async function handleTargetSelect(client, interaction) {
  if (!interaction.isUserSelectMenu()) return false;
  if (interaction.customId !== "sanction_target_select") return false;

  if (!hasSanctionPermission(interaction.member)) {
    await safeReply(interaction, {
      content: "❌ Du hast keine Berechtigung, Sanktionen zu erstellen.",
      ephemeral: true,
    });
    return true;
  }

  const draft = getDraft(interaction.user.id) || createNewDraft(interaction.user.id);
  const targetId = interaction.values?.[0];

  if (!targetId) {
    await safeReply(interaction, {
      content: "❌ Keine Person ausgewählt.",
      ephemeral: true,
    });
    return true;
  }

  const member = await interaction.guild.members.fetch(targetId).catch(() => null);

  draft.targetId = targetId;
  draft.targetName = member
    ? getMemberDisplayName(member, member.user)
    : `<@${targetId}>`;

  sanctionDrafts.set(interaction.user.id, draft);

  await interaction.update({
    embeds: [createDraftEmbed(draft)],
    components: createDraftButtons(draft),
  });

  return true;
}

async function handleDraftButtons(client, interaction) {
  if (!interaction.isButton()) return false;

  const customId = interaction.customId;

  if (![
    "sanction_add_catalog",
    "sanction_add_custom",
    "sanction_finish",
    "sanction_abort",
  ].includes(customId)) {
    return false;
  }

  if (!hasSanctionPermission(interaction.member)) {
    await safeReply(interaction, {
      content: "❌ Du hast keine Berechtigung, Sanktionen zu erstellen.",
      ephemeral: true,
    });
    return true;
  }

  const draft = getDraft(interaction.user.id);

  if (!draft) {
    await safeReply(interaction, {
      content: "❌ Kein aktiver Sanktionsentwurf gefunden. Bitte starte erneut über das Leaderpanel.",
      ephemeral: true,
    });
    return true;
  }

  if (customId === "sanction_abort") {
    sanctionDrafts.delete(interaction.user.id);

    await interaction.update({
      content: "❌ Sanktionsentwurf abgebrochen.",
      embeds: [],
      components: [],
    });

    return true;
  }

  if (customId === "sanction_add_catalog") {
    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(CONFIG.embedColor)
          .setTitle("📚 • Sanktionskatalog")
          .setDescription("Wähle eine Kategorie aus."),
      ],
      components: [createCategorySelectRow()],
    });

    return true;
  }

  if (customId === "sanction_add_custom") {
    await interaction.showModal(createCustomSanctionModal());
    return true;
  }

  if (customId === "sanction_finish") {
    if (!draft.targetId || !draft.items.length) {
      await safeReply(interaction, {
        content: "❌ Bitte wähle zuerst eine Person und mindestens eine Sanktion aus.",
        ephemeral: true,
      });
      return true;
    }

    await postSanction(client, interaction, draft);
    return true;
  }

  return false;
}

async function handleCategorySelect(client, interaction) {
  if (!interaction.isStringSelectMenu()) return false;
  if (interaction.customId !== "sanction_category_select") return false;

  if (!hasSanctionPermission(interaction.member)) {
    await safeReply(interaction, {
      content: "❌ Du hast keine Berechtigung, Sanktionen zu erstellen.",
      ephemeral: true,
    });
    return true;
  }

  const categoryId = interaction.values?.[0];
  const category = getCategory(categoryId);

  if (!category) {
    await safeReply(interaction, {
      content: "❌ Kategorie wurde nicht gefunden.",
      ephemeral: true,
    });
    return true;
  }

  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(CONFIG.embedColor)
        .setTitle(`${category.emoji} • ${category.label}`)
        .setDescription("Wähle das Vergehen aus. Die Metall-Menge wird danach manuell eingetragen."),
    ],
    components: [createOffenseSelectRow(categoryId)],
  });

  return true;
}

async function handleOffenseSelect(client, interaction) {
  if (!interaction.isStringSelectMenu()) return false;
  if (!interaction.customId.startsWith("sanction_offense_select_")) return false;

  if (!hasSanctionPermission(interaction.member)) {
    await safeReply(interaction, {
      content: "❌ Du hast keine Berechtigung, Sanktionen zu erstellen.",
      ephemeral: true,
    });
    return true;
  }

  const itemId = interaction.values?.[0];
  const catalogItem = getCatalogItem(itemId);

  if (!catalogItem) {
    await safeReply(interaction, {
      content: "❌ Dieses Vergehen wurde nicht gefunden.",
      ephemeral: true,
    });
    return true;
  }

  await interaction.showModal(createMetalAmountModal(catalogItem));
  return true;
}

async function handleDraftModals(client, interaction) {
  if (!interaction.isModalSubmit()) return false;

  if (interaction.customId === "sanction_custom_modal") {
    if (!hasSanctionPermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung, Sanktionen zu erstellen.",
        ephemeral: true,
      });
      return true;
    }

    const draft = getDraft(interaction.user.id);

    if (!draft) {
      await safeReply(interaction, {
        content: "❌ Kein aktiver Sanktionsentwurf gefunden. Bitte starte erneut über das Leaderpanel.",
        ephemeral: true,
      });
      return true;
    }

    const reason = cleanText(interaction.fields.getTextInputValue("sanction_reason"));
    const metalAmount = parseMetal(interaction.fields.getTextInputValue("sanction_metal"));
    const note = cleanText(interaction.fields.getTextInputValue("sanction_note"), "");

    if (!metalAmount || metalAmount <= 0) {
      await safeReply(interaction, {
        content: "❌ Bitte gib eine gültige Metall-Menge ein.",
        ephemeral: true,
      });
      return true;
    }

    draft.items.push({
      reason,
      metalAmount,
      amount: 0,
      note: note || null,
      catalogId: null,
    });

    sanctionDrafts.set(interaction.user.id, draft);

    await safeReply(interaction, {
      embeds: [createDraftEmbed(draft)],
      components: createDraftButtons(draft),
      ephemeral: true,
    });

    return true;
  }

  if (interaction.customId.startsWith("sanction_metal_modal_")) {
    if (!hasSanctionPermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung, Sanktionen zu erstellen.",
        ephemeral: true,
      });
      return true;
    }

    const itemId = interaction.customId.replace("sanction_metal_modal_", "");
    const catalogItem = getCatalogItem(itemId);
    const draft = getDraft(interaction.user.id);

    if (!draft || !catalogItem) {
      await safeReply(interaction, {
        content: "❌ Entwurf oder Katalogeintrag wurde nicht gefunden.",
        ephemeral: true,
      });
      return true;
    }

    const metalAmount = parseMetal(interaction.fields.getTextInputValue("sanction_metal"));
    const noteInput = cleanText(interaction.fields.getTextInputValue("sanction_note"), "");

    if (!metalAmount || metalAmount <= 0) {
      await safeReply(interaction, {
        content: "❌ Bitte gib eine gültige Metall-Menge ein.",
        ephemeral: true,
      });
      return true;
    }

    draft.items.push({
      reason: catalogItem.label,
      metalAmount,
      amount: 0,
      note: noteInput || catalogItem.note || null,
      catalogId: catalogItem.id,
    });

    sanctionDrafts.set(interaction.user.id, draft);

    await safeReply(interaction, {
      embeds: [createDraftEmbed(draft)],
      components: createDraftButtons(draft),
      ephemeral: true,
    });

    return true;
  }

  return false;
}

// =====================================================
// INTERACTIONS: POSTED SANCTIONS
// =====================================================

async function handlePostedSanctionButtons(client, interaction) {
  if (!interaction.isButton()) return false;

  const customId = interaction.customId;

  let action = null;
  let sanctionId = null;

  if (customId.startsWith("sanction_paid_")) {
    action = "paid";
    sanctionId = customId.replace("sanction_paid_", "");
  } else if (customId.startsWith("sanction_cancel_")) {
    action = "cancel";
    sanctionId = customId.replace("sanction_cancel_", "");
  } else {
    return false;
  }

  if (!hasSanctionPermission(interaction.member)) {
    await safeReply(interaction, {
      content: "❌ Du hast keine Berechtigung, diese Sanktion zu bearbeiten.",
      ephemeral: true,
    });
    return true;
  }

  const data = loadData();
  const sanction = data.sanctions?.[sanctionId];

  if (!sanction) {
    await safeReply(interaction, {
      content: "❌ Diese Sanktion wurde nicht im Speicher gefunden.",
      ephemeral: true,
    });
    return true;
  }

  if (sanction.status === "paid" || sanction.status === "cancelled") {
    await safeReply(interaction, {
      content: "ℹ️ Diese Sanktion ist bereits abgeschlossen.",
      ephemeral: true,
    });
    return true;
  }

  if (action === "paid") {
    sanction.status = "paid";
    sanction.paidBy = interaction.user.id;
    sanction.paidAt = Date.now();
  }

  if (action === "cancel") {
    sanction.status = "cancelled";
    sanction.cancelledBy = interaction.user.id;
    sanction.cancelledAt = Date.now();
  }

  data.sanctions[sanctionId] = sanction;
  saveData(data);

  await updateSanctionMessage(client, sanction);

  await safeReply(interaction, {
    content: action === "paid"
      ? "✅ Sanktion wurde als bezahlt markiert."
      : "❌ Sanktion wurde storniert.",
    ephemeral: true,
  });

  return true;
}

// =====================================================
// OVERDUE CHECK
// =====================================================

async function checkOverdueSanctions(client) {
  const data = loadData();
  if (!data.sanctions) return;

  let changed = false;

  for (const [sanctionId, sanction] of Object.entries(data.sanctions)) {
    if (!sanction) continue;
    if (sanction.status !== "open") continue;
    if (!sanction.dueAt || Date.now() < Number(sanction.dueAt)) continue;

    sanction.status = "overdue";
    sanction.overdueNotified = true;
    data.sanctions[sanctionId] = sanction;
    changed = true;

    await updateSanctionMessage(client, sanction);

    await sendToChannel(client, CONFIG.sanctionChannelId, {
      content: [
        `<@${sanction.targetId}>`,
        "",
        "⏰ **SANKTION ÜBERFÄLLIG**",
        "",
        `Die Sanktion **${sanction.id}** ist überfällig.`,
        `Offene Abgabe: **${formatMetal(sanction.totalMetal || 0)}**`,
      ].join("\n"),
      allowedMentions: {
        users: [sanction.targetId],
      },
    });
  }

  if (changed) saveData(data);
}

// =====================================================
// MAIN HANDLER
// =====================================================

async function handleSanctionsInteraction(client, interaction) {
  if (await handleLeaderPanelCommand(client, interaction)) return true;
  if (await handleCreateSanctionButton(client, interaction)) return true;
  if (await handleTargetSelect(client, interaction)) return true;
  if (await handleDraftButtons(client, interaction)) return true;
  if (await handleCategorySelect(client, interaction)) return true;
  if (await handleOffenseSelect(client, interaction)) return true;
  if (await handleDraftModals(client, interaction)) return true;
  if (await handlePostedSanctionButtons(client, interaction)) return true;

  return false;
}

module.exports = {
  leaderPanelCommand,
  handleSanctionsInteraction,
  checkOverdueSanctions,
};