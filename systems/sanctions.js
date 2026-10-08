const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  UserSelectMenuBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const CONFIG = require("../config");

const { loadData, saveData } = require("../utils/dataStore");
const { unixTimestamp } = require("../utils/dates");
const { formatMoney, truncate, createShortId } = require("../utils/format");
const {
  hasLeaderPermission,
  hasSanctionCreatorPermission,
} = require("../utils/permissions");
const { sendToChannel, safeReply } = require("../utils/discord");

// =====================================================
// SLASH COMMAND
// =====================================================

const leaderPanelCommand = new SlashCommandBuilder()
  .setName("leaderpanel")
  .setDescription("Sendet das SMV-Leaderpanel.");

// =====================================================
// SANKTIONSLISTE
// =====================================================

const SANCTIONS = [
  { id: "p12", section: "§12", label: "Wochenabgabe nicht abgegeben", amount: 150000, special: "Wochenabgabe" },
  { id: "p14", section: "§14", label: "Nicht im Funk sein, ohne Abmeldung", amount: 140000 },
  { id: "p15", section: "§15", label: "Nichttragen von GPS, ohne Absprache", amount: 140000 },
  { id: "p16", section: "§16", label: "Bei Aufstellung angemeldet aber nicht da", amount: 100000 },
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

const SANCTION_MAP = new Map(SANCTIONS.map((sanction) => [sanction.id, sanction]));

const sanctionDrafts = new Map();

// =====================================================
// HELPER
// =====================================================

function getStatusLabel(record) {
  if (record.cancelled) return "STORNIERT";
  if (record.paid) return "BEZAHLT";
  if (Date.now() >= record.dueAt) return "ÜBERFÄLLIG";
  return "OFFEN";
}

function getStatusEmoji(record) {
  if (record.cancelled) return "❌";
  if (record.paid) return "✅";
  if (Date.now() >= record.dueAt) return "🚨";
  return "⏳";
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

  const leaderPanelChannelId = CONFIG.leaderPanelChannelId || CONFIG.sanctionChannelId;

  const message = await sendToChannel(client, leaderPanelChannelId, {
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
    content: `✅ Leaderpanel wurde in <#${leaderPanelChannelId}> gesendet.`,
    ephemeral: true,
  });
}

// =====================================================
// DRAFT / AUSWAHL
// =====================================================

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
    .filter((sanction) => {
      const number = Number(sanction.section.replace("§", ""));
      return number >= startSection && number <= endSection;
    })
    .map((sanction) => ({
      label: truncate(`${sanction.section} ${sanction.label}`, 100),
      description: truncate(
        sanction.special
          ? `${sanction.special}${sanction.amount ? ` + ${formatMoney(sanction.amount)}` : ""}`
          : formatMoney(sanction.amount),
        100
      ),
      value: sanction.id,
    }));
}

function createSanctionBuilderComponents(leaderId) {
  const draft = getSanctionDraft(leaderId);

  const rowUser = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId("sanction_user_select")
      .setPlaceholder("Betroffene Person auswählen")
      .setMinValues(1)
      .setMaxValues(1)
  );

  const group1Options = createSanctionOptions(12, 29);
  const group2Options = createSanctionOptions(31, 45);
  const group3Options = createSanctionOptions(46, 60);

  const rowGroup1 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("sanction_select_group1")
      .setPlaceholder("Regelkatalog auswählen: §12 - §29")
      .setMinValues(0)
      .setMaxValues(group1Options.length)
      .addOptions(group1Options)
  );

  const rowGroup2 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("sanction_select_group2")
      .setPlaceholder("Regelkatalog auswählen: §31 - §45")
      .setMinValues(0)
      .setMaxValues(group2Options.length)
      .addOptions(group2Options)
  );

  const rowGroup3 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("sanction_select_group3")
      .setPlaceholder("Regelkatalog auswählen: §46 - §60")
      .setMinValues(0)
      .setMaxValues(group3Options.length)
      .addOptions(group3Options)
  );

  const selectedCount = getDraftSelectedIds(draft).length;

  const rowButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("sanction_submit")
      .setLabel(`Ausstellen (${selectedCount})`)
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

  const targetText = draft.targetUserId ? `<@${draft.targetUserId}>` : "Noch keine Person ausgewählt";

  const total = selectedSanctions.reduce((sum, sanction) => sum + (Number(sanction.amount) || 0), 0);

  const sanctionsText = selectedSanctions.length
    ? selectedSanctions
        .map((sanction, index) => {
          const isLast = index === selectedSanctions.length - 1;
          const punishment = sanction.special && sanction.amount
            ? `${sanction.special} + ${formatMoney(sanction.amount)}`
            : sanction.special
              ? sanction.special
              : formatMoney(sanction.amount);

          return `${isLast ? "┖" : "┃"} **${sanction.section}** ${sanction.label}\n${isLast ? " " : "┃"} └ ${punishment}`;
        })
        .join("\n")
    : "┖ Noch keine Sanktion ausgewählt";

  return [
    "⚠️ **SMV SANKTIONSERSTELLUNG**",
    "━━━━━━━━━━━━━━━━━━━━",
    "",
    "👤 **BETROFFENE PERSON**",
    `┖ ${targetText}`,
    "",
    "📋 **AUSGEWÄHLTE SANKTIONEN**",
    sanctionsText,
    "",
    "💰 **BERECHNUNG**",
    `┃ Anzahl: **${selectedSanctions.length}**`,
    `┖ Summe: **${total > 0 ? formatMoney(total) : "Keine feste Geldsumme"}**`,
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    "Wähle zuerst die Person und danach eine oder mehrere Sanktionen aus.",
  ].join("\n");
}

// =====================================================
// SANKTION ERSTELLEN
// =====================================================

function calculateSanctionTotals(selectedSanctions) {
  const total = selectedSanctions.reduce((sum, sanction) => sum + (Number(sanction.amount) || 0), 0);

  const specials = selectedSanctions
    .filter((sanction) => sanction.special)
    .map((sanction) => `${sanction.section}: ${sanction.special}`);

  return {
    total,
    specials,
  };
}

function formatSanctionList(selectedSanctions) {
  return selectedSanctions
    .map((sanction, index) => {
      const punishment =
        sanction.special && sanction.amount
          ? `${sanction.special} + ${formatMoney(sanction.amount)}`
          : sanction.special
            ? sanction.special
            : formatMoney(sanction.amount);

      const isLast = index === selectedSanctions.length - 1;

      return [
        `${isLast ? "┖" : "┃"} **${sanction.section}** ${sanction.label}`,
        `${isLast ? " " : "┃"} └ ${punishment}`,
      ].join("\n");
    })
    .join("\n")
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
    sanctionIds: selectedSanctions.map((sanction) => sanction.id),
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
    ? record.specials.map((special, index) => {
        const isLast = index === record.specials.length - 1;
        return `${isLast ? "┖" : "┃"} ${special}`;
      }).join("\n")
    : "┖ Keine";

  const statusLabel = getStatusLabel(record);
  const statusEmoji = getStatusEmoji(record);

  const statusText = record.cancelled
    ? `❌ Storniert von <@${record.cancelledBy}> am <t:${unixTimestamp(record.cancelledAt)}:F>`
    : record.paid
      ? `✅ Bezahlt von <@${record.paidBy}> am <t:${unixTimestamp(record.paidAt)}:F>`
      : Date.now() >= record.dueAt
        ? "🚨 Überfällig"
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
    .setTitle(`${statusEmoji} • SMV SANKTION`)
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━━━",
        `👤 **Betroffene Person:** <@${record.targetUserId}>`,
        `👑 **Ausgestellt von:** <@${record.leaderId}>`,
        `📌 **Status:** **${statusLabel}**`,
        `🆔 **Sanktion-ID:** \`${record.id}\``,
        "━━━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .addFields(
      {
        name: "📋 REGELVERSTÖSSE",
        value: formatSanctionList(selectedSanctions) || "┖ Keine Sanktion gefunden",
        inline: false,
      },
      {
        name: "💰 ZU BEZAHLEN",
        value: `┖ **${moneyText}**`,
        inline: true,
      },
      {
        name: "⚖️ SONDERSTRAFE",
        value: specialText,
        inline: true,
      },
      {
        name: "⏳ ZEITRAUM",
        value: [
          `┃ Erstellt: <t:${createdUnix}:F>`,
          `┃ Frist: <t:${dueUnix}:F>`,
          `┖ Restzeit: <t:${dueUnix}:R>`,
        ].join("\n"),
        inline: false,
      },
      {
        name: "📌 STATUSDETAIL",
        value: `┖ ${statusText}`,
        inline: false,
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

async function updateSanctionMessage(client, record) {
  if (!record.messageId) return;

  const channel = await client.channels.fetch(CONFIG.sanctionChannelId).catch(() => null);
  if (!channel || !channel.messages) return;

  const message = await channel.messages.fetch(record.messageId).catch(() => null);
  if (!message) return;

  await message.edit({
    embeds: [createSanctionEmbed(record)],
    components: [createSanctionButtons(record)],
  }).catch(() => null);
}

async function createAndPostSanction(client, interaction, draft) {
  const selectedIds = getDraftSelectedIds(draft);
  const selectedSanctions = selectedIds.map((id) => SANCTION_MAP.get(id)).filter(Boolean);

  if (!draft.targetUserId) {
    return safeReply(interaction, {
      content: "❌ Bitte wähle zuerst einen User aus.",
      ephemeral: true,
    });
  }

  if (selectedSanctions.length === 0) {
    return safeReply(interaction, {
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

  const message = await sendToChannel(client, CONFIG.sanctionChannelId, {
    embeds: [createSanctionEmbed(record)],
    components: [createSanctionButtons(record)],
  });

  if (!message) {
    return safeReply(interaction, {
      content: "❌ Der Sanktionschannel wurde nicht gefunden.",
      ephemeral: true,
    });
  }

  record.messageId = message.id;

  const data = loadData();
  if (!data.sanctions) data.sanctions = {};
  data.sanctions[record.id] = record;
  saveData(data);

  sanctionDrafts.delete(interaction.user.id);

  await sendToChannel(client, CONFIG.sanctionLogChannelId, {
    embeds: [
      new EmbedBuilder()
        .setColor(CONFIG.warningColor)
        .setTitle("⚠️ • NEUE SANKTION ERSTELLT")
        .setDescription(
          [
            "━━━━━━━━━━━━━━━━━━━━",
            `👤 **Name:** <@${record.targetUserId}>`,
            `💰 **Zu bezahlen:** ${record.total > 0 ? `**${formatMoney(record.total)}**` : "**Keine feste Geldsumme**"}`,
            `⏳ **Frist:** <t:${unixTimestamp(record.dueAt)}:F>`,
            `📌 **Restzeit:** <t:${unixTimestamp(record.dueAt)}:R>`,
            `👑 **Ausgestellt von:** <@${record.leaderId}>`,
            `🆔 **Sanktion-ID:** \`${record.id}\``,
            "━━━━━━━━━━━━━━━━━━━━",
          ].join("\n")
        )
        .setFooter({ text: `${CONFIG.shortName} • Sanktionslog` }),
    ],
  });

  return safeReply(interaction, {
    content: `✅ Sanktion wurde erfolgreich in <#${CONFIG.sanctionChannelId}> erstellt.`,
    ephemeral: true,
  });
}

// =====================================================
// BEZAHLT / STORNIERT
// =====================================================

async function markSanctionPaid(client, interaction, sanctionId) {
  if (!hasLeaderPermission(interaction.member)) {
    return safeReply(interaction, {
      content: "❌ Nur die Leaderschaft darf Sanktionen als bezahlt markieren.",
      ephemeral: true,
    });
  }

  const data = loadData();
  const record = data.sanctions?.[sanctionId];

  if (!record) {
    return safeReply(interaction, {
      content: "❌ Diese Sanktion wurde nicht im Speicher gefunden.",
      ephemeral: true,
    });
  }

  if (record.paid || record.cancelled) {
    return safeReply(interaction, {
      content: "ℹ️ Diese Sanktion ist bereits abgeschlossen.",
      ephemeral: true,
    });
  }

  record.paid = true;
  record.paidAt = Date.now();
  record.paidBy = interaction.user.id;

  data.sanctions[sanctionId] = record;
  saveData(data);

  await updateSanctionMessage(client, record);

  await sendToChannel(client, CONFIG.sanctionLogChannelId, {
    embeds: [
      new EmbedBuilder()
        .setColor(CONFIG.successColor)
        .setTitle("✅ • SANKTION BEZAHLT")
        .setDescription(
          [
            "━━━━━━━━━━━━━━━━━━━━",
            `👤 **Name:** <@${record.targetUserId}>`,
            `✅ **Bezahlt markiert von:** <@${interaction.user.id}>`,
            `🆔 **Sanktion-ID:** \`${record.id}\``,
            "━━━━━━━━━━━━━━━━━━━━",
          ].join("\n")
        ),
    ],
  });

  return safeReply(interaction, {
    content: "✅ Sanktion wurde als bezahlt markiert.",
    ephemeral: true,
  });
}

async function cancelSanction(client, interaction, sanctionId) {
  if (!hasLeaderPermission(interaction.member)) {
    return safeReply(interaction, {
      content: "❌ Nur die Leaderschaft darf Sanktionen stornieren.",
      ephemeral: true,
    });
  }

  const data = loadData();
  const record = data.sanctions?.[sanctionId];

  if (!record) {
    return safeReply(interaction, {
      content: "❌ Diese Sanktion wurde nicht im Speicher gefunden.",
      ephemeral: true,
    });
  }

  if (record.paid || record.cancelled) {
    return safeReply(interaction, {
      content: "ℹ️ Diese Sanktion ist bereits abgeschlossen.",
      ephemeral: true,
    });
  }

  record.cancelled = true;
  record.cancelledAt = Date.now();
  record.cancelledBy = interaction.user.id;

  data.sanctions[sanctionId] = record;
  saveData(data);

  await updateSanctionMessage(client, record);

  await sendToChannel(client, CONFIG.sanctionLogChannelId, {
    embeds: [
      new EmbedBuilder()
        .setColor(CONFIG.dangerColor)
        .setTitle("❌ • SANKTION STORNIERT")
        .setDescription(
          [
            "━━━━━━━━━━━━━━━━━━━━",
            `👤 **Name:** <@${record.targetUserId}>`,
            `❌ **Storniert von:** <@${interaction.user.id}>`,
            `🆔 **Sanktion-ID:** \`${record.id}\``,
            "━━━━━━━━━━━━━━━━━━━━",
          ].join("\n")
        ),
    ],
  });

  return safeReply(interaction, {
    content: "✅ Sanktion wurde storniert.",
    ephemeral: true,
  });
}

// =====================================================
// ÜBERFÄLLIGE SANKTIONEN
// =====================================================

async function checkOverdueSanctions(client) {
  const data = loadData();
  let changed = false;

  for (const record of Object.values(data.sanctions || {})) {
    if (record.paid) continue;
    if (record.cancelled) continue;
    if (record.warnedOverdue) continue;
    if (Date.now() < record.dueAt) continue;

    record.warnedOverdue = true;
    changed = true;

    await sendToChannel(client, CONFIG.sanctionLogChannelId, {
      embeds: [
        new EmbedBuilder()
          .setColor(CONFIG.dangerColor)
          .setTitle("🚨 • SANKTION ÜBERFÄLLIG")
          .setDescription(
            [
              "━━━━━━━━━━━━━━━━━━━━",
              `👤 **Name:** <@${record.targetUserId}>`,
              `💰 **Zu bezahlen:** ${record.total > 0 ? `**${formatMoney(record.total)}**` : "**Keine feste Geldsumme**"}`,
              `⏳ **Frist war:** <t:${unixTimestamp(record.dueAt)}:F>`,
              `🚨 **Überfällig seit:** <t:${unixTimestamp(record.dueAt)}:R>`,
              `👑 **Ausgestellt von:** <@${record.leaderId}>`,
              `🆔 **Sanktion-ID:** \`${record.id}\``,
              "━━━━━━━━━━━━━━━━━━━━",
            ].join("\n")
          )
          .setFooter({ text: `${CONFIG.shortName} • Sanktionslog` }),
      ],
    });

    await updateSanctionMessage(client, record).catch(() => null);
  }

  if (changed) saveData(data);
}

// =====================================================
// INTERACTIONS
// =====================================================

async function handleLeaderPanelCommand(client, interaction) {
  if (!interaction.isChatInputCommand()) return false;
  if (interaction.commandName !== "leaderpanel") return false;

  await sendLeaderPanel(client, interaction);
  return true;
}

async function handleSanctionButtons(client, interaction) {
  if (!interaction.isButton()) return false;

  if (interaction.customId === "leader_create_sanction") {
    if (!hasSanctionCreatorPermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung, Sanktionen zu erstellen.",
        ephemeral: true,
      });
      return true;
    }

    createSanctionDraft(interaction.user.id);

    await safeReply(interaction, {
      content: createSanctionDraftText(interaction.user.id),
      components: createSanctionBuilderComponents(interaction.user.id),
      ephemeral: true,
    });

    return true;
  }

  if (interaction.customId === "sanction_clear") {
    if (!hasSanctionCreatorPermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung, Sanktionen zu erstellen.",
        ephemeral: true,
      });
      return true;
    }

    createSanctionDraft(interaction.user.id);

    await interaction.update({
      content: createSanctionDraftText(interaction.user.id),
      components: createSanctionBuilderComponents(interaction.user.id),
    });

    return true;
  }

  if (interaction.customId === "sanction_submit") {
    if (!hasSanctionCreatorPermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung, Sanktionen zu erstellen.",
        ephemeral: true,
      });
      return true;
    }

    const draft = getSanctionDraft(interaction.user.id);
    await createAndPostSanction(client, interaction, draft);
    return true;
  }

  if (interaction.customId.startsWith("sanction_paid_")) {
    const sanctionId = interaction.customId.replace("sanction_paid_", "");
    await markSanctionPaid(client, interaction, sanctionId);
    return true;
  }

  if (interaction.customId.startsWith("sanction_cancel_")) {
    const sanctionId = interaction.customId.replace("sanction_cancel_", "");
    await cancelSanction(client, interaction, sanctionId);
    return true;
  }

  return false;
}

async function handleSanctionSelects(client, interaction) {
  if (!interaction.isStringSelectMenu() && !interaction.isUserSelectMenu()) return false;

  if (interaction.customId === "sanction_user_select") {
    if (!hasSanctionCreatorPermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung, Sanktionen zu erstellen.",
        ephemeral: true,
      });
      return true;
    }

    const draft = getSanctionDraft(interaction.user.id);
    draft.targetUserId = interaction.values?.[0] || null;
    sanctionDrafts.set(interaction.user.id, draft);

    await interaction.update({
      content: createSanctionDraftText(interaction.user.id),
      components: createSanctionBuilderComponents(interaction.user.id),
    });

    return true;
  }

  if (
    interaction.customId === "sanction_select_group1" ||
    interaction.customId === "sanction_select_group2" ||
    interaction.customId === "sanction_select_group3"
  ) {
    if (!hasSanctionCreatorPermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung, Sanktionen zu erstellen.",
        ephemeral: true,
      });
      return true;
    }

    const draft = getSanctionDraft(interaction.user.id);

    const group =
      interaction.customId === "sanction_select_group1"
        ? "group1"
        : interaction.customId === "sanction_select_group2"
          ? "group2"
          : "group3";

    draft.selectedByMenu[group] = interaction.values || [];
    sanctionDrafts.set(interaction.user.id, draft);

    await interaction.update({
      content: createSanctionDraftText(interaction.user.id),
      components: createSanctionBuilderComponents(interaction.user.id),
    });

    return true;
  }

  return false;
}

async function handleSanctionsInteraction(client, interaction) {
  if (await handleLeaderPanelCommand(client, interaction)) return true;
  if (await handleSanctionButtons(client, interaction)) return true;
  if (await handleSanctionSelects(client, interaction)) return true;

  return false;
}

module.exports = {
  leaderPanelCommand,
  SANCTIONS,
  SANCTION_MAP,
  createLeaderPanelEmbed,
  createLeaderPanelButtons,
  handleSanctionsInteraction,
  checkOverdueSanctions,
};
