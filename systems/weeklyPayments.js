const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const CONFIG = require("../config");

const { loadData, saveData } = require("../utils/dataStore");
const { getBerlinParts, formatGermanDateTimeFromMs, unixTimestamp } = require("../utils/dates");
const { getReadableUserName, createShortId } = require("../utils/format");
const {
  hasLeaderPermission,
  canUseWeeklyPaymentManagement,
} = require("../utils/permissions");
const { sendToChannel, safeReply } = require("../utils/discord");

// =====================================================
// WOCHEN-HILFSFUNKTIONEN
// =====================================================

function getBerlinDateObject(date = new Date()) {
  const parts = getBerlinParts(date);
  return new Date(`${parts.dateKey}T12:00:00Z`);
}

function getMondayDate(date = new Date()) {
  const berlinDate = getBerlinDateObject(date);
  const day = berlinDate.getUTCDay(); // 0 Sonntag, 1 Montag ...
  const diff = day === 0 ? -6 : 1 - day;

  berlinDate.setUTCDate(berlinDate.getUTCDate() + diff);
  return berlinDate;
}

function addWeeks(date, weeks = 0) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + weeks * 7);
  return result;
}

function formatDateGermanFromDate(date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}.${month}.${year}`;
}

function getWeekKeyFromMonday(mondayDate) {
  const year = mondayDate.getUTCFullYear();
  const month = String(mondayDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(mondayDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getWeekInfo(offset = 0) {
  const currentMonday = getMondayDate();
  const monday = addWeeks(currentMonday, offset);
  const sunday = addWeeks(monday, 0);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return {
    weekKey: getWeekKeyFromMonday(monday),
    fromText: formatDateGermanFromDate(monday),
    untilText: formatDateGermanFromDate(sunday),
    label: `${formatDateGermanFromDate(monday)} - ${formatDateGermanFromDate(sunday)}`,
  };
}

function getWeekInfos(count = 1) {
  return Array.from({ length: count }, (_, index) => getWeekInfo(index));
}

// =====================================================
// COMPONENTS
// =====================================================

function createWeeklyPaymentWeekSelect() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("weekly_payment_weeks_select")
      .setPlaceholder("Für wie viele Wochen möchtest du abgeben?")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        {
          label: "1 Woche",
          value: "1",
          emoji: "1️⃣",
          description: "Wochenabgabe für 1 Woche bestätigen",
        },
        {
          label: "2 Wochen",
          value: "2",
          emoji: "2️⃣",
          description: "Wochenabgabe für 2 Wochen bestätigen",
        },
        {
          label: "3 Wochen",
          value: "3",
          emoji: "3️⃣",
          description: "Wochenabgabe für 3 Wochen bestätigen",
        },
        {
          label: "4 Wochen",
          value: "4",
          emoji: "4️⃣",
          description: "Wochenabgabe für 4 Wochen bestätigen",
        },
        {
          label: "5 Wochen",
          value: "5",
          emoji: "5️⃣",
          description: "Wochenabgabe für 5 Wochen bestätigen",
        },
        {
          label: "6 Wochen",
          value: "6",
          emoji: "6️⃣",
          description: "Wochenabgabe für 6 Wochen bestätigen",
        }
      )
  );
}

function createWeeklyManageSelect() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("weekly_manage_select")
      .setPlaceholder("Was möchtest du bei der Wochenabgabe verwalten?")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        {
          label: "Übersicht anzeigen",
          value: "overview",
          emoji: "📊",
          description: "Zeigt gespeicherte Wochenabgaben",
        },
        {
          label: "Aktuelle Woche prüfen",
          value: "current_week",
          emoji: "🔍",
          description: "Zeigt die aktuelle Woche",
        }
      )
  );
}

// =====================================================
// ZAHLUNG SPEICHERN
// =====================================================

function ensureWeeklyPayments(data) {
  if (!data.weeklyPayments) data.weeklyPayments = {};
  return data.weeklyPayments;
}

function createWeeklyPaymentRecord({ weekKey, userId, userName, batchId, batchWeekKeys }) {
  return {
    id: createShortId(),
    weekKey,
    userId,
    userName,
    paidAt: Date.now(),
    batchId,
    batchWeekKeys,
    removed: false,
    removedAt: null,
    removedBy: null,
  };
}

async function removePayerRoleIfPossible(interaction) {
  const member = interaction.member;

  if (!member?.roles?.cache?.has(CONFIG.payerRoleId)) return false;

  try {
    await member.roles.remove(CONFIG.payerRoleId, "Wochenabgabe bestätigt");
    return true;
  } catch (error) {
    console.error("❌ Zahlende/r-Rolle konnte nicht entfernt werden:", error);
    return false;
  }
}

async function confirmWeeklyPayment(client, interaction, weeksCount) {
  const count = Math.max(1, Math.min(Number(weeksCount) || 1, 6));
  const weekInfos = getWeekInfos(count);
  const batchId = createShortId();

  const data = loadData();
  const weeklyPayments = ensureWeeklyPayments(data);

  const userId = interaction.user.id;
  const userName = getReadableUserName(interaction.member, interaction.user);
  const batchWeekKeys = weekInfos.map((week) => week.weekKey);

  let newlySaved = 0;
  let alreadySaved = 0;

  for (const week of weekInfos) {
    const key = `${week.weekKey}:${userId}`;

    if (weeklyPayments[key] && !weeklyPayments[key].removed) {
      alreadySaved++;
      continue;
    }

    weeklyPayments[key] = createWeeklyPaymentRecord({
      weekKey: week.weekKey,
      userId,
      userName,
      batchId,
      batchWeekKeys,
    });

    newlySaved++;
  }

  data.weeklyPayments = weeklyPayments;
  saveData(data);

  const roleRemoved = await removePayerRoleIfPossible(interaction);

  await sendToChannel(client, CONFIG.weeklyPaymentChannelId, {
    embeds: [
      new EmbedBuilder()
        .setColor(CONFIG.successColor)
        .setTitle("💸 Wochenabgabe bestätigt")
        .setDescription(
          [
            "━━━━━━━━━━━━━━━━━━━━",
            `👤 **Name:** <@${userId}>`,
            `🧾 **Anzahl Wochen:** ${count}`,
            "",
            "**Zeitraum:**",
            weekInfos.map((week) => `┖ ${week.label}`).join("\n"),
            "",
            `✅ **Neu gespeichert:** ${newlySaved}`,
            `ℹ️ **Bereits vorhanden:** ${alreadySaved}`,
            `🏷️ **Zahlende/r-Rolle entfernt:** ${roleRemoved ? "Ja" : "Nein / nicht vorhanden"}`,
            `🕘 **Zeitpunkt:** <t:${unixTimestamp(Date.now())}:F>`,
            "━━━━━━━━━━━━━━━━━━━━",
          ].join("\n")
        )
        .setFooter({
          text: `${CONFIG.shortName} • Wochenabgabe • Batch: ${batchId}`,
        }),
    ],
    allowedMentions: { users: [userId] },
  });

  return safeReply(interaction, {
    content: [
      `✅ Wochenabgabe wurde für **${count} Woche${count === 1 ? "" : "n"}** gespeichert.`,
      "",
      weekInfos.map((week) => `• ${week.label}`).join("\n"),
    ].join("\n"),
    ephemeral: true,
  });
}

// =====================================================
// ÜBERSICHT
// =====================================================

function createWeeklyOverviewEmbed(data, mode = "overview") {
  const payments = Object.values(data.weeklyPayments || {})
    .filter((payment) => !payment.removed)
    .sort((a, b) => String(b.paidAt || "").localeCompare(String(a.paidAt || "")));

  const currentWeek = getWeekInfo(0);

  const relevantPayments =
    mode === "current_week"
      ? payments.filter((payment) => payment.weekKey === currentWeek.weekKey)
      : payments.slice(0, 25);

  const lines = relevantPayments.length
    ? relevantPayments.map((payment, index) => {
        const isLast = index === relevantPayments.length - 1;
        return `${isLast ? "┖" : "┃"} <@${payment.userId}> • Woche \`${payment.weekKey}\` • <t:${unixTimestamp(payment.paidAt)}:R>`;
      })
    : ["┖ Keine Einträge gefunden"];

  return new EmbedBuilder()
    .setColor(CONFIG.embedColor)
    .setTitle(mode === "current_week" ? "💸 Wochenabgabe • Aktuelle Woche" : "💸 Wochenabgabe • Übersicht")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━━━",
        mode === "current_week"
          ? `📅 **Aktuelle Woche:** ${currentWeek.label}`
          : "📊 **Letzte gespeicherte Wochenabgaben**",
        "",
        lines.join("\n").slice(0, 3500),
        "",
        `🕘 **Aktualisiert:** ${formatGermanDateTimeFromMs(Date.now())}`,
        "━━━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setFooter({
      text: `${CONFIG.shortName} • Wochenabgabe`,
    });
}

async function sendWeeklyOverview(client, interaction, mode = "overview") {
  if (!canUseWeeklyPaymentManagement(interaction.member)) {
    return safeReply(interaction, {
      content: "❌ Du hast keine Berechtigung für die Wochenabgabe-Verwaltung.",
      ephemeral: true,
    });
  }

  const data = loadData();

  return safeReply(interaction, {
    embeds: [createWeeklyOverviewEmbed(data, mode)],
    ephemeral: true,
  });
}

// =====================================================
// INTERACTIONS
// =====================================================

async function handleWeeklyPaymentButton(client, interaction) {
  if (!interaction.isButton()) return false;

  if (interaction.customId === "family_weekly_payment") {
    await safeReply(interaction, {
      content: "💸 Für wie viele Wochen möchtest du deine Wochenabgabe bestätigen?",
      components: [createWeeklyPaymentWeekSelect()],
      ephemeral: true,
    });

    return true;
  }

  if (interaction.customId === "leader_weekly_manage") {
    if (!hasLeaderPermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung für die Wochenabgabe-Verwaltung.",
        ephemeral: true,
      });
      return true;
    }

    await safeReply(interaction, {
      content: "💸 Was möchtest du bei der Wochenabgabe verwalten?",
      components: [createWeeklyManageSelect()],
      ephemeral: true,
    });

    return true;
  }

  return false;
}

async function handleWeeklyPaymentSelect(client, interaction) {
  if (!interaction.isStringSelectMenu()) return false;

  if (interaction.customId === "weekly_payment_weeks_select") {
    const weeks = interaction.values?.[0] || "1";
    await confirmWeeklyPayment(client, interaction, weeks);
    return true;
  }

  if (interaction.customId === "weekly_manage_select") {
    const selected = interaction.values?.[0];

    if (selected === "overview") {
      await sendWeeklyOverview(client, interaction, "overview");
      return true;
    }

    if (selected === "current_week") {
      await sendWeeklyOverview(client, interaction, "current_week");
      return true;
    }
  }

  return false;
}

async function handleWeeklyPaymentInteraction(client, interaction) {
  if (await handleWeeklyPaymentButton(client, interaction)) return true;
  if (await handleWeeklyPaymentSelect(client, interaction)) return true;

  return false;
}

module.exports = {
  handleWeeklyPaymentInteraction,
  createWeeklyPaymentWeekSelect,
  createWeeklyOverviewEmbed,
};
