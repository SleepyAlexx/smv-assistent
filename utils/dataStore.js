const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "smv-data.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

function getDefaultStorageCategories() {
  return {
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
  };
}

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

    storage: {
      categories: getDefaultStorageCategories(),
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

function normalizeStorageCategories(data = {}) {
  const currentCategories = data.storage?.categories;

  let categories;

  // Nur beim allerersten Start Standard-Kategorien erstellen.
  // Wenn später Kategorien gelöscht wurden, sollen sie NICHT automatisch zurückkommen.
  if (!currentCategories || Object.keys(currentCategories).length === 0) {
    categories = getDefaultStorageCategories();
  } else {
    categories = currentCategories;
  }

  // Alte fehlerhafte Kategorie aus früherer Version entfernen.
  // "kurzwafen" hatte dieselbe ID wie "kurzwaffen" und verursacht doppelte Dropdown-Werte.
  if (
    categories.kurzwafen &&
    categories.kurzwaffen &&
    categories.kurzwafen.id === categories.kurzwaffen.id
  ) {
    delete categories.kurzwafen;
  }

  // Sicherstellen, dass jede Kategorie ein items-Objekt hat.
  for (const category of Object.values(categories || {})) {
    if (!category.items) {
      category.items = {};
    }
  }

  return categories;
}

function normalizeData(data = {}) {
  const defaults = getDefaultData();

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
      categories: normalizeStorageCategories(data),
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
