const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
} = require("discord.js");

const CONFIG = require("../config");

const { loadData, saveData } = require("../utils/dataStore");
const {
  hasStoragePanelPermission,
  hasStorageDepositPermission,
  hasStorageWithdrawPermission,
  hasStorageManagePermission,
} = require("../utils/permissions");
const {
  createStorageItemId,
  normalizeCategoryId,
  normalizeItemName,
} = require("../utils/format");
const { formatGermanDateTimeFromMs } = require("../utils/dates");
const { sendToChannel, safeReply } = require("../utils/discord");

// =====================================================
// SLASH COMMAND
// =====================================================

const storagePanelCommand = new SlashCommandBuilder()
  .setName("lagerpanel")
  .setDescription("Sendet oder aktualisiert das SMV-Lagerpanel.");

// =====================================================
// GRUNDLAGE
// =====================================================

function getDefaultStorage() {
  return {
    categories: {},
    panelMessageId: null,
    logs: [],
  };
}

function ensureStorage(data) {
  const defaults = getDefaultStorage();

  if (!data.storage) {
    data.storage = defaults;
  }

  if (!data.storage.categories) {
    data.storage.categories = {};
  }

  if (!data.storage.logs) {
    data.storage.logs = [];
  }

  if (!("panelMessageId" in data.storage)) {
    data.storage.panelMessageId = null;
  }

  for (const category of Object.values(data.storage.categories || {})) {
    if (!category.items) {
      category.items = {};
    }
  }

  // Alte fehlerhafte Kategorie aus früherer Version entfernen.
  if (
    data.storage.categories.kurzwafen &&
    data.storage.categories.kurzwaffen &&
    data.storage.categories.kurzwafen.id === data.storage.categories.kurzwaffen.id
  ) {
    delete data.storage.categories.kurzwafen;
  }

  return data.storage;
}

function getStorageCategories(storage) {
  const seenIds = new Set();

  return Object.values(storage.categories || {})
    .filter(Boolean)
    .filter((category) => {
      if (!category.id) return false;

      if (seenIds.has(category.id)) {
        return false;
      }

      seenIds.add(category.id);
      return true;
    })
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "de"));
}

function getCategory(storage, categoryId) {
  if (!categoryId) return null;
  return storage.categories?.[categoryId] || null;
}

function getCategoryOptions(storage) {
  const categories = getStorageCategories(storage).slice(0, 25);

  return categories.map((category) => ({
    label: String(category.name || category.id).slice(0, 100),
    description: `Kategorie: ${category.id}`.slice(0, 100),
    value: category.id,
    emoji: category.emoji || "📦",
  }));
}

function findItem(storage, categoryId, itemName) {
  const category = getCategory(storage, categoryId);
  if (!category) return null;

  const itemId = createStorageItemId(itemName);
  return category.items?.[itemId] || null;
}

function upsertItem(storage, categoryId, itemName, amountChange = 0) {
  const category = getCategory(storage, categoryId);
  if (!category) return null;

  const cleanItemName = normalizeItemName(itemName);
  const itemId = createStorageItemId(cleanItemName);

  if (!itemId) return null;

  if (!category.items[itemId]) {
    category.items[itemId] = {
      id: itemId,
      name: cleanItemName,
      amount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  const item = category.items[itemId];
  item.name = cleanItemName;
  item.amount = Math.max(0, Number(item.amount || 0) + Number(amountChange || 0));
  item.updatedAt = Date.now();

  return item;
}

function setItemAmount(storage, categoryId, itemName, amount) {
  const category = getCategory(storage, categoryId);
  if (!category) return null;

  const cleanItemName = normalizeItemName(itemName);
  const itemId = createStorageItemId(cleanItemName);

  if (!itemId) return null;

  if (!category.items[itemId]) {
    category.items[itemId] = {
      id: itemId,
      name: cleanItemName,
      amount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  const item = category.items[itemId];
  item.name = cleanItemName;
  item.amount = Math.max(0, Number(amount || 0));
  item.updatedAt = Date.now();

  return item;
}

function saveStorageLog(storage, logEntry) {
  if (!storage.logs) storage.logs = [];

  storage.logs.push({
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    ...logEntry,
    createdAt: Date.now(),
  });

  if (storage.logs.length > 500) {
    storage.logs = storage.logs.slice(storage.logs.length - 500);
  }
}

// =====================================================
// EMBEDS / COMPONENTS
// =====================================================

function createStoragePanelEmbed(storage) {
  const categories = getStorageCategories(storage);

  const embed = new EmbedBuilder()
    .setColor(CONFIG.embedColor)
    .setTitle("📦 • SMV LAGERBESTAND")
    .setDescription(
      [
        "━━━━━━━━━━━━━━━━━━━━",
        "Hier wird der aktuelle Lagerbestand der Familie verwaltet.",
        "",
        "Nutze die Buttons unten, um Gegenstände einzulagern, auszulagern oder das Lager zu verwalten.",
        "━━━━━━━━━━━━━━━━━━━━",
      ].join("\n")
    )
    .setFooter({
      text: `${CONFIG.shortName} • Lagersystem • ${formatGermanDateTimeFromMs(Date.now())}`,
    });

  if (categories.length === 0) {
    embed.addFields({
      name: "📦 Lager leer",
      value: "┖ Noch keine Kategorien vorhanden",
      inline: false,
    });

    return embed;
  }

  for (const category of categories) {
    const items = Object.values(category.items || {})
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "de"));

    const value = items.length
      ? items
          .map((item, index) => {
            const isLast = index === items.length - 1;
            return `${isLast ? "┖" : "┃"} **${item.name}**: ${Number(item.amount || 0).toLocaleString("de-DE")}x`;
          })
          .join("\n")
      : "┖ Keine Einträge";

    embed.addFields({
      name: `${category.emoji || "📦"} ${category.name || category.id}`,
      value: value.slice(0, 1024),
      inline: false,
    });
  }

  return embed;
}

function createStoragePanelButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("storage_deposit")
        .setLabel("Einlagern")
        .setEmoji("➕")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("storage_withdraw")
        .setLabel("Auslagern")
        .setEmoji("➖")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("storage_manage")
        .setLabel("Lager verwalten")
        .setEmoji("⚙️")
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

function createCategorySelect(storage, customId, placeholder) {
  const options = getCategoryOptions(storage);

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options.length ? options : [
        {
          label: "Keine Kategorie vorhanden",
          value: "none",
          description: "Bitte erst eine Kategorie erstellen.",
          emoji: "⚠️",
        },
      ])
  );
}

function createStorageActionModal(type, categoryId) {
  const isDeposit = type === "deposit";
  const isWithdraw = type === "withdraw";

  const modal = new ModalBuilder()
    .setCustomId(`storage_${type}_modal_${categoryId}`)
    .setTitle(isDeposit ? "➕ Einlagern" : "➖ Auslagern");

  const itemInput = new TextInputBuilder()
    .setCustomId("item_name")
    .setLabel("Gegenstand")
    .setPlaceholder("z. B. Karabiner")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(60)
    .setRequired(true);

  const amountInput = new TextInputBuilder()
    .setCustomId("item_amount")
    .setLabel("Anzahl")
    .setPlaceholder("z. B. 5")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(8)
    .setRequired(true);

  const recipientInput = new TextInputBuilder()
    .setCustomId("item_recipient")
    .setLabel("An wen geht es?")
    .setPlaceholder("z. B. Alex, Fußball-Team, Eventgruppe")
    .setStyle(TextInputStyle.Short)
    .setMinLength(2)
    .setMaxLength(80)
    .setRequired(true);

  const noteInput = new TextInputBuilder()
    .setCustomId("item_note")
    .setLabel("Notiz / Grund")
    .setPlaceholder(isDeposit ? "z. B. Route / Einkauf" : "z. B. Fußball-Event")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(80)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(itemInput),
    new ActionRowBuilder().addComponents(amountInput)
  );

  if (isWithdraw) {
    modal.addComponents(new ActionRowBuilder().addComponents(recipientInput));
  }

  modal.addComponents(new ActionRowBuilder().addComponents(noteInput));

  return modal;
}

function createStorageManageMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("storage_manage_select")
      .setPlaceholder("Was möchtest du verwalten?")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        {
          label: "Kategorie hinzufügen",
          value: "add_category",
          emoji: "📁",
          description: "Neue Lager-Kategorie erstellen",
        },
        {
          label: "Gegenstand hinzufügen",
          value: "add_item",
          emoji: "➕",
          description: "Neuen Gegenstand in einer Kategorie anlegen",
        },
        {
          label: "Bestand korrigieren",
          value: "set_item",
          emoji: "🔧",
          description: "Bestand eines Gegenstands fest setzen",
        },
        {
          label: "Gegenstand löschen",
          value: "delete_item",
          emoji: "🗑️",
          description: "Einen Gegenstand aus dem Lager entfernen",
        },
        {
          label: "Kategorie löschen",
          value: "delete_category",
          emoji: "🧹",
          description: "Eine ganze Kategorie löschen",
        }
      )
  );
}

function createManageAddCategoryModal() {
  const modal = new ModalBuilder()
    .setCustomId("storage_manage_add_category_modal")
    .setTitle("📁 Kategorie hinzufügen");

  const nameInput = new TextInputBuilder()
    .setCustomId("category_name")
    .setLabel("Name der Kategorie")
    .setPlaceholder("z. B. Munition")
    .setStyle(TextInputStyle.Short)
    .setMinLength(2)
    .setMaxLength(40)
    .setRequired(true);

  const emojiInput = new TextInputBuilder()
    .setCustomId("category_emoji")
    .setLabel("Emoji")
    .setPlaceholder("z. B. 📦")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(4)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(emojiInput)
  );

  return modal;
}

function createManageItemModal(type, categoryId) {
  const titles = {
    add_item: "➕ Gegenstand hinzufügen",
    set_item: "🔧 Bestand korrigieren",
    delete_item: "🗑️ Gegenstand löschen",
  };

  const modal = new ModalBuilder()
    .setCustomId(`storage_manage_${type}_modal_${categoryId}`)
    .setTitle(titles[type] || "⚙️ Lager verwalten");

  const itemInput = new TextInputBuilder()
    .setCustomId("item_name")
    .setLabel("Gegenstand")
    .setPlaceholder("z. B. Karabiner")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(60)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(itemInput));

  if (type === "add_item" || type === "set_item") {
    const amountInput = new TextInputBuilder()
      .setCustomId("item_amount")
      .setLabel(type === "set_item" ? "Neuer Bestand" : "Startbestand")
      .setPlaceholder("z. B. 10")
      .setStyle(TextInputStyle.Short)
      .setMinLength(1)
      .setMaxLength(8)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
  }

  return modal;
}

// =====================================================
// LOGS
// =====================================================

async function logStorageAction(client, actionData) {
  const {
    action,
    category,
    itemName,
    oldAmount,
    newAmount,
    amount,
    userId,
    note,
    recipient,
  } = actionData;

  const isDeposit = action === "deposit";
  const isWithdraw = action === "withdraw";

  const channelId = isDeposit
    ? CONFIG.storageDepositLogChannelId
    : isWithdraw
      ? CONFIG.storageWithdrawLogChannelId
      : CONFIG.storageLogChannelId || CONFIG.storageChannelId;

  const title = isDeposit
    ? "➕ Eingelagert"
    : isWithdraw
      ? "➖ Ausgelagert"
      : "⚙️ Lager verwaltet";

  const color = isDeposit
    ? CONFIG.successColor
    : isWithdraw
      ? CONFIG.dangerColor
      : CONFIG.warningColor;

  const fields = [
    {
      name: "Kategorie",
      value: `${category?.emoji || "📦"} ${category?.name || "Unbekannt"}`,
      inline: true,
    },
    {
      name: "Gegenstand",
      value: itemName || "—",
      inline: true,
    },
    {
      name: isDeposit ? "Eingelagert" : isWithdraw ? "Ausgelagert" : "Menge",
      value: `${Number(amount || 0).toLocaleString("de-DE")}x`,
      inline: true,
    },
    {
      name: "Alter Bestand",
      value: `${Number(oldAmount || 0).toLocaleString("de-DE")}x`,
      inline: true,
    },
    {
      name: "Neuer Bestand",
      value: `${Number(newAmount || 0).toLocaleString("de-DE")}x`,
      inline: true,
    },
    {
      name: "Von",
      value: `<@${userId}>`,
      inline: true,
    },
  ];

  if (isWithdraw) {
    fields.push({
      name: "Rausgegeben an",
      value: recipient || "—",
      inline: false,
    });
  }

  fields.push({
    name: "Notiz",
    value: note || "—",
    inline: false,
  });

  await sendToChannel(client, channelId, {
    embeds: [
      new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .addFields(fields)
        .setFooter({
          text: `${CONFIG.shortName} • Lagerlog • ${formatGermanDateTimeFromMs(Date.now())}`,
        }),
    ],
    allowedMentions: { users: [userId] },
  });
}

// =====================================================
// PANEL SENDEN / AKTUALISIEREN
// =====================================================

async function updateStoragePanel(client) {
  const data = loadData();
  const storage = ensureStorage(data);
  data.storage = storage;
  saveData(data);

  const channel = await client.channels.fetch(CONFIG.storageChannelId).catch(() => null);
  if (!channel || !channel.messages) return null;

  const payload = {
    embeds: [createStoragePanelEmbed(storage)],
    components: createStoragePanelButtons(),
  };

  if (storage.panelMessageId) {
    const oldMessage = await channel.messages.fetch(storage.panelMessageId).catch(() => null);

    if (oldMessage) {
      await oldMessage.edit(payload).catch(() => null);
      return oldMessage;
    }
  }

  const newMessage = await channel.send(payload).catch(() => null);

  if (newMessage) {
    storage.panelMessageId = newMessage.id;
    data.storage = storage;
    saveData(data);
  }

  return newMessage;
}

async function sendStoragePanelCommand(client, interaction) {
  if (!hasStoragePanelPermission(interaction.member)) {
    return safeReply(interaction, {
      content: "❌ Du hast keine Berechtigung für das Lagerpanel.",
      ephemeral: true,
    });
  }

  const message = await updateStoragePanel(client);

  if (!message) {
    return safeReply(interaction, {
      content: "❌ Lagerpanel konnte nicht gesendet werden. Bitte prüfe Channel-ID und Bot-Rechte.",
      ephemeral: true,
    });
  }

  return safeReply(interaction, {
    content: `✅ Lagerpanel wurde in <#${CONFIG.storageChannelId}> gesendet/aktualisiert.`,
    ephemeral: true,
  });
}

// =====================================================
// INTERACTIONS
// =====================================================

async function handleStorageCommand(client, interaction) {
  if (!interaction.isChatInputCommand()) return false;
  if (interaction.commandName !== "lagerpanel") return false;

  await sendStoragePanelCommand(client, interaction);
  return true;
}

async function handleStorageButton(client, interaction) {
  if (!interaction.isButton()) return false;

  const customId = interaction.customId;

  if (customId === "storage_deposit") {
    if (!hasStorageDepositPermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung zum Einlagern.",
        ephemeral: true,
      });
      return true;
    }

    const data = loadData();
    const storage = ensureStorage(data);
    data.storage = storage;
    saveData(data);

    await safeReply(interaction, {
      content: "📦 Wähle eine Kategorie aus, in die du einlagern möchtest.",
      components: [createCategorySelect(storage, "storage_deposit_category", "Kategorie fürs Einlagern auswählen")],
      ephemeral: true,
    });

    return true;
  }

  if (customId === "storage_withdraw") {
    if (!hasStorageWithdrawPermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung zum Auslagern.",
        ephemeral: true,
      });
      return true;
    }

    const data = loadData();
    const storage = ensureStorage(data);
    data.storage = storage;
    saveData(data);

    await safeReply(interaction, {
      content: "📦 Wähle eine Kategorie aus, aus der du auslagern möchtest.",
      components: [createCategorySelect(storage, "storage_withdraw_category", "Kategorie fürs Auslagern auswählen")],
      ephemeral: true,
    });

    return true;
  }

  if (customId === "storage_manage") {
    if (!hasStorageManagePermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung für die Lagerverwaltung.",
        ephemeral: true,
      });
      return true;
    }

    await safeReply(interaction, {
      content: "⚙️ Was möchtest du im Lager verwalten?",
      components: [createStorageManageMenu()],
      ephemeral: true,
    });

    return true;
  }

  return false;
}

async function handleStorageSelect(client, interaction) {
  if (!interaction.isStringSelectMenu()) return false;

  const customId = interaction.customId;
  const selected = interaction.values?.[0];

  if (!selected || selected === "none") {
    await safeReply(interaction, {
      content: "❌ Keine gültige Auswahl.",
      ephemeral: true,
    });
    return true;
  }

  if (customId === "storage_deposit_category") {
    if (!hasStorageDepositPermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung zum Einlagern.",
        ephemeral: true,
      });
      return true;
    }

    await interaction.showModal(createStorageActionModal("deposit", selected));
    return true;
  }

  if (customId === "storage_withdraw_category") {
    if (!hasStorageWithdrawPermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung zum Auslagern.",
        ephemeral: true,
      });
      return true;
    }

    await interaction.showModal(createStorageActionModal("withdraw", selected));
    return true;
  }

  if (customId === "storage_manage_select") {
    if (!hasStorageManagePermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung für die Lagerverwaltung.",
        ephemeral: true,
      });
      return true;
    }

    if (selected === "add_category") {
      await interaction.showModal(createManageAddCategoryModal());
      return true;
    }

    if (selected === "add_item" || selected === "set_item" || selected === "delete_item") {
      const data = loadData();
      const storage = ensureStorage(data);
      data.storage = storage;
      saveData(data);

      await safeReply(interaction, {
        content: "📦 Wähle die Kategorie aus.",
        components: [createCategorySelect(storage, `storage_manage_category_${selected}`, "Kategorie auswählen")],
        ephemeral: true,
      });

      return true;
    }

    if (selected === "delete_category") {
      const data = loadData();
      const storage = ensureStorage(data);
      data.storage = storage;
      saveData(data);

      await safeReply(interaction, {
        content: "🧹 Wähle die Kategorie aus, die gelöscht werden soll.",
        components: [createCategorySelect(storage, "storage_manage_category_delete_category", "Kategorie löschen")],
        ephemeral: true,
      });

      return true;
    }
  }

  if (customId.startsWith("storage_manage_category_")) {
    if (!hasStorageManagePermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung für die Lagerverwaltung.",
        ephemeral: true,
      });
      return true;
    }

    const action = customId.replace("storage_manage_category_", "");

    if (action === "delete_category") {
      const data = loadData();
      const storage = ensureStorage(data);
      const category = getCategory(storage, selected);

      if (!category) {
        await safeReply(interaction, {
          content: "❌ Kategorie wurde nicht gefunden.",
          ephemeral: true,
        });
        return true;
      }

      delete storage.categories[selected];
      data.storage = storage;
      saveData(data);

      await updateStoragePanel(client);

      await safeReply(interaction, {
        content: `✅ Kategorie **${category.name}** wurde gelöscht.`,
        ephemeral: true,
      });

      await logStorageAction(client, {
        action: "manage",
        category,
        itemName: "Kategorie gelöscht",
        oldAmount: 0,
        newAmount: 0,
        amount: 0,
        userId: interaction.user.id,
        note: `Kategorie ${category.name} gelöscht`,
      });

      return true;
    }

    await interaction.showModal(createManageItemModal(action, selected));
    return true;
  }

  return false;
}

async function handleStorageModal(client, interaction) {
  if (!interaction.isModalSubmit()) return false;

  const customId = interaction.customId;

  if (customId.startsWith("storage_deposit_modal_")) {
    if (!hasStorageDepositPermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung zum Einlagern.",
        ephemeral: true,
      });
      return true;
    }

    const categoryId = customId.replace("storage_deposit_modal_", "");
    await processStorageAmountChange(client, interaction, categoryId, "deposit");
    return true;
  }

  if (customId.startsWith("storage_withdraw_modal_")) {
    if (!hasStorageWithdrawPermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung zum Auslagern.",
        ephemeral: true,
      });
      return true;
    }

    const categoryId = customId.replace("storage_withdraw_modal_", "");
    await processStorageAmountChange(client, interaction, categoryId, "withdraw");
    return true;
  }

  if (customId === "storage_manage_add_category_modal") {
    if (!hasStorageManagePermission(interaction.member)) {
      await safeReply(interaction, {
        content: "❌ Du hast keine Berechtigung für die Lagerverwaltung.",
        ephemeral: true,
      });
      return true;
    }

    const data = loadData();
    const storage = ensureStorage(data);

    const categoryName = normalizeItemName(interaction.fields.getTextInputValue("category_name"));
    const categoryEmoji = String(interaction.fields.getTextInputValue("category_emoji") || "📦").trim() || "📦";
    const categoryId = normalizeCategoryId(categoryName);

    if (!categoryId) {
      await safeReply(interaction, {
        content: "❌ Ungültiger Kategoriename.",
        ephemeral: true,
      });
      return true;
    }

    if (storage.categories[categoryId]) {
      await safeReply(interaction, {
        content: "❌ Diese Kategorie existiert bereits.",
        ephemeral: true,
      });
      return true;
    }

    storage.categories[categoryId] = {
      id: categoryId,
      name: categoryName,
      emoji: categoryEmoji,
      items: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    data.storage = storage;
    saveData(data);

    await updateStoragePanel(client);

    await safeReply(interaction, {
      content: `✅ Kategorie **${categoryEmoji} ${categoryName}** wurde erstellt.`,
      ephemeral: true,
    });

    await logStorageAction(client, {
      action: "manage",
      category: storage.categories[categoryId],
      itemName: "Kategorie hinzugefügt",
      oldAmount: 0,
      newAmount: 0,
      amount: 0,
      userId: interaction.user.id,
      note: `Kategorie ${categoryName} erstellt`,
    });

    return true;
  }

  if (customId.startsWith("storage_manage_add_item_modal_")) {
    const categoryId = customId.replace("storage_manage_add_item_modal_", "");
    await processStorageSetItem(client, interaction, categoryId, "add_item");
    return true;
  }

  if (customId.startsWith("storage_manage_set_item_modal_")) {
    const categoryId = customId.replace("storage_manage_set_item_modal_", "");
    await processStorageSetItem(client, interaction, categoryId, "set_item");
    return true;
  }

  if (customId.startsWith("storage_manage_delete_item_modal_")) {
    const categoryId = customId.replace("storage_manage_delete_item_modal_", "");
    await processStorageDeleteItem(client, interaction, categoryId);
    return true;
  }

  return false;
}

// =====================================================
// VERARBEITUNG
// =====================================================

async function processStorageAmountChange(client, interaction, categoryId, action) {
  const data = loadData();
  const storage = ensureStorage(data);
  const category = getCategory(storage, categoryId);

  if (!category) {
    return safeReply(interaction, {
      content: "❌ Kategorie wurde nicht gefunden.",
      ephemeral: true,
    });
  }

  const itemName = normalizeItemName(interaction.fields.getTextInputValue("item_name"));
  const amountRaw = String(interaction.fields.getTextInputValue("item_amount") || "").trim();
  const note = String(interaction.fields.getTextInputValue("item_note") || "").trim();

  let recipient = null;

  if (action === "withdraw") {
    recipient = String(interaction.fields.getTextInputValue("item_recipient") || "").trim();

    if (!recipient || recipient.length < 2) {
      return safeReply(interaction, {
        content: "❌ Bitte gib ein, an wen die Sachen rausgegeben wurden.",
        ephemeral: true,
      });
    }
  }

  if (!/^\d+$/.test(amountRaw)) {
    return safeReply(interaction, {
      content: "❌ Die Anzahl darf nur aus Zahlen bestehen.",
      ephemeral: true,
    });
  }

  const amount = Number(amountRaw);

  if (!Number.isInteger(amount) || amount <= 0) {
    return safeReply(interaction, {
      content: "❌ Die Anzahl muss mindestens 1 sein.",
      ephemeral: true,
    });
  }

  const existingItem = findItem(storage, categoryId, itemName);
  const oldAmount = Number(existingItem?.amount || 0);

  if (action === "withdraw" && oldAmount < amount) {
    return safeReply(interaction, {
      content: `❌ Nicht genug Bestand vorhanden. Aktuell: **${oldAmount}x**`,
      ephemeral: true,
    });
  }

  const change = action === "deposit" ? amount : -amount;
  const item = upsertItem(storage, categoryId, itemName, change);
  const newAmount = Number(item.amount || 0);

  saveStorageLog(storage, {
    action,
    categoryId: category.id,
    categoryName: category.name,
    itemId: item.id,
    itemName: item.name,
    oldAmount,
    newAmount,
    amount,
    userId: interaction.user.id,
    recipient,
    note,
  });

  data.storage = storage;
  saveData(data);

  await updateStoragePanel(client);

  await logStorageAction(client, {
    action,
    category,
    itemName: item.name,
    oldAmount,
    newAmount,
    amount,
    userId: interaction.user.id,
    recipient,
    note,
  });

  return safeReply(interaction, {
    content: action === "deposit"
      ? `✅ **${amount}x ${item.name}** wurde eingelagert. Neuer Bestand: **${newAmount}x**`
      : `✅ **${amount}x ${item.name}** wurde an **${recipient}** ausgelagert. Neuer Bestand: **${newAmount}x**`,
    ephemeral: true,
  });
}

async function processStorageSetItem(client, interaction, categoryId, mode) {
  if (!hasStorageManagePermission(interaction.member)) {
    return safeReply(interaction, {
      content: "❌ Du hast keine Berechtigung für die Lagerverwaltung.",
      ephemeral: true,
    });
  }

  const data = loadData();
  const storage = ensureStorage(data);
  const category = getCategory(storage, categoryId);

  if (!category) {
    return safeReply(interaction, {
      content: "❌ Kategorie wurde nicht gefunden.",
      ephemeral: true,
    });
  }

  const itemName = normalizeItemName(interaction.fields.getTextInputValue("item_name"));
  const amountRaw = String(interaction.fields.getTextInputValue("item_amount") || "").trim();

  if (!/^\d+$/.test(amountRaw)) {
    return safeReply(interaction, {
      content: "❌ Der Bestand darf nur aus Zahlen bestehen.",
      ephemeral: true,
    });
  }

  const newAmountWanted = Number(amountRaw);

  if (!Number.isInteger(newAmountWanted) || newAmountWanted < 0) {
    return safeReply(interaction, {
      content: "❌ Der Bestand darf nicht negativ sein.",
      ephemeral: true,
    });
  }

  const existingItem = findItem(storage, categoryId, itemName);
  const oldAmount = Number(existingItem?.amount || 0);

  const item = setItemAmount(storage, categoryId, itemName, newAmountWanted);
  const newAmount = Number(item.amount || 0);

  saveStorageLog(storage, {
    action: "manage",
    categoryId: category.id,
    categoryName: category.name,
    itemId: item.id,
    itemName: item.name,
    oldAmount,
    newAmount,
    amount: Math.abs(newAmount - oldAmount),
    userId: interaction.user.id,
    recipient: null,
    note: mode === "add_item" ? "Gegenstand hinzugefügt" : "Bestand korrigiert",
  });

  data.storage = storage;
  saveData(data);

  await updateStoragePanel(client);

  await logStorageAction(client, {
    action: "manage",
    category,
    itemName: item.name,
    oldAmount,
    newAmount,
    amount: Math.abs(newAmount - oldAmount),
    userId: interaction.user.id,
    note: mode === "add_item" ? "Gegenstand hinzugefügt" : "Bestand korrigiert",
  });

  return safeReply(interaction, {
    content: mode === "add_item"
      ? `✅ **${item.name}** wurde mit **${newAmount}x** hinzugefügt.`
      : `✅ Bestand von **${item.name}** wurde auf **${newAmount}x** gesetzt.`,
    ephemeral: true,
  });
}

async function processStorageDeleteItem(client, interaction, categoryId) {
  if (!hasStorageManagePermission(interaction.member)) {
    return safeReply(interaction, {
      content: "❌ Du hast keine Berechtigung für die Lagerverwaltung.",
      ephemeral: true,
    });
  }

  const data = loadData();
  const storage = ensureStorage(data);
  const category = getCategory(storage, categoryId);

  if (!category) {
    return safeReply(interaction, {
      content: "❌ Kategorie wurde nicht gefunden.",
      ephemeral: true,
    });
  }

  const itemName = normalizeItemName(interaction.fields.getTextInputValue("item_name"));
  const itemId = createStorageItemId(itemName);
  const item = category.items?.[itemId];

  if (!item) {
    return safeReply(interaction, {
      content: "❌ Dieser Gegenstand wurde in der Kategorie nicht gefunden.",
      ephemeral: true,
    });
  }

  const oldAmount = Number(item.amount || 0);
  const oldName = item.name;

  delete category.items[itemId];

  saveStorageLog(storage, {
    action: "manage",
    categoryId: category.id,
    categoryName: category.name,
    itemId,
    itemName: oldName,
    oldAmount,
    newAmount: 0,
    amount: oldAmount,
    userId: interaction.user.id,
    recipient: null,
    note: "Gegenstand gelöscht",
  });

  data.storage = storage;
  saveData(data);

  await updateStoragePanel(client);

  await logStorageAction(client, {
    action: "manage",
    category,
    itemName: oldName,
    oldAmount,
    newAmount: 0,
    amount: oldAmount,
    userId: interaction.user.id,
    note: "Gegenstand gelöscht",
  });

  return safeReply(interaction, {
    content: `✅ **${oldName}** wurde aus dem Lager gelöscht.`,
    ephemeral: true,
  });
}

async function handleStorageInteraction(client, interaction) {
  if (await handleStorageCommand(client, interaction)) return true;
  if (await handleStorageButton(client, interaction)) return true;
  if (await handleStorageSelect(client, interaction)) return true;
  if (await handleStorageModal(client, interaction)) return true;

  return false;
}

module.exports = {
  storagePanelCommand,
  handleStorageInteraction,
  updateStoragePanel,
};
