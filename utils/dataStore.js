const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "smv-data.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

function getDefaultData() {
  return {
    postedDates: {},
    lineups: {},
    sanctions: {},
    footballEvents: {},
    weeklyPayments: {},
    weeklySummaries: {},
    weeklyPaymentPauses: {},
    lineupReminders: {},
    dailyReports: {},
    healthChecks: {},
    backups: {},
    absences: {},

    // Lagersystem
    storage: {
      categories: {
        allgemein: {
          id: "allgemein",
          name: "Allgemein",
          emoji: "📦",
          items: {},
        },
        langwaffen: {
          id: "langwaffen",
          name: "Langwaffen",
          emoji: "🔫",
          items: {},
        },
        kurzwaffen: {
          id: "kurzwaffen",
          name: "Kurzwaffen",
          emoji: "🔫",
          items: {},
        },
        drugs: {
          id: "drugs",
          name: "Drugs",
          emoji: "💊",
          items: {},
        },
        aufsaetze: {
          id: "aufsaetze",
          name: "Aufsätze",
          emoji: "🧩",
          items: {},
        },
      },
      panelMessageId: null,
      logs: [],
    },
  };
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(getDefaultData(), null, 2));
  }
}

function normalizeData(data = {}) {
  const defaults = getDefaultData();

  const storageCategories = {
    ...defaults.storage.categories,
    ...(data.storage?.categories || {}),
  };

  // Alte fehlerhafte Kategorie aus früherer Version entfernen.
  // "kurzwafen" hatte dieselbe ID wie "kurzwaffen" und verursacht doppelte Dropdown-Werte.
  if (
    storageCategories.kurzwafen &&
    storageCategories.kurzwaffen &&
    storageCategories.kurzwafen.id === storageCategories.kurzwaffen.id
  ) {
    delete storageCategories.kurzwafen;
  }

  return {
    ...defaults,
    ...data,

    postedDates: data.postedDates || {},
    lineups: data.lineups || {},
    sanctions: data.sanctions || {},
    footballEvents: data.footballEvents || {},
    weeklyPayments: data.weeklyPayments || {},
    weeklySummaries: data.weeklySummaries || {},
    weeklyPaymentPauses: data.weeklyPaymentPauses || {},
    lineupReminders: data.lineupReminders || {},
    dailyReports: data.dailyReports || {},
    healthChecks: data.healthChecks || {},
    backups: data.backups || {},
    absences: data.absences || {},

    storage: {
      ...defaults.storage,
      ...(data.storage || {}),
      categories: storageCategories,
      logs: data.storage?.logs || [],
      panelMessageId: data.storage?.panelMessageId || null,
    },
  };
}

function loadData() {
  ensureDataFile();

  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return normalizeData(parsed);
  } catch (error) {
    console.error("❌ smv-data.json konnte nicht gelesen werden:", error);
    return getDefaultData();
  }
}

function saveData(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(normalizeData(data), null, 2));
}

module.exports = {
  DATA_DIR,
  DATA_FILE,
  BACKUP_DIR,
  getDefaultData,
  ensureDataFile,
  loadData,
  saveData,
};
