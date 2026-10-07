const CONFIG = require("../config");

function getGermanDateTime() {
  return new Date().toLocaleString("de-DE", {
    timeZone: CONFIG.timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatGermanDateTimeFromMs(ms) {
  return new Date(ms).toLocaleString("de-DE", {
    timeZone: CONFIG.timezone,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBerlinParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("de-DE", {
    timeZone: CONFIG.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;

  const day = get("day");
  const month = get("month");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");
  const weekday = get("weekday");

  return {
    day,
    month,
    year,
    hour,
    minute,
    weekday,
    dateKey: `${year}-${month}-${day}`,
    dateText: `${day}.${month}.${year}`,
  };
}

function getTomorrowBerlinParts() {
  const now = getBerlinParts();
  const date = new Date(`${now.dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return getBerlinParts(date);
}

function formatDateKeyGerman(dateKey) {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return "—";

  const [year, month, day] = dateKey.split("-");
  return `${day}.${month}.${year}`;
}

function addDaysToDateKey(dateKey, days = 0) {
  if (!dateKey) return null;

  const date = new Date(`${dateKey}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  date.setUTCDate(date.getUTCDate() + days);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseGermanDateKey(input) {
  const match = String(input || "").trim().match(/^(\d{1,2})[.](\d{1,2})[.](\d{4})$/);
  if (!match) return null;

  const day = String(Number(match[1])).padStart(2, "0");
  const month = String(Number(match[2])).padStart(2, "0");
  const year = match[3];

  const date = new Date(`${year}-${month}-${day}T12:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function normalizeGermanDateInput(input) {
  const raw = String(input || "").trim();

  if (!raw) {
    return {
      ok: false,
      error: "Bitte gib ein Datum ein.",
      dateKey: null,
      dateText: null,
    };
  }

  if (/[a-zA-ZäöüÄÖÜß]/.test(raw)) {
    return {
      ok: false,
      error: "Im Datum sind keine Buchstaben erlaubt. Bitte nutze TT.MM.JJJJ.",
      dateKey: null,
      dateText: null,
    };
  }

  const digits = raw.replace(/\D/g, "");

  if (digits.length !== 8) {
    return {
      ok: false,
      error: "Bitte gib das Datum im Format TT.MM.JJJJ ein.",
      dateKey: null,
      dateText: null,
    };
  }

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  const dateText = `${day}.${month}.${year}`;
  const dateKey = parseGermanDateKey(dateText);

  if (!dateKey) {
    return {
      ok: false,
      error: "Dieses Datum ist ungültig. Bitte prüfe Tag, Monat und Jahr.",
      dateKey: null,
      dateText: null,
    };
  }

  return {
    ok: true,
    error: null,
    dateKey,
    dateText,
  };
}

function repairBrokenGermanYear(input) {
  const value = String(input || "").trim();

  const match = value.match(/^(\d{1,2})[.](\d{1,2})[.](\d{5})$/);
  if (!match) return value;

  const day = String(Number(match[1])).padStart(2, "0");
  const month = String(Number(match[2])).padStart(2, "0");
  const brokenYear = match[3];

  // Beispiel: 20206 -> 2026
  if (brokenYear.startsWith("202")) {
    const fixedYear = `202${brokenYear.at(-1)}`;
    return `${day}.${month}.${fixedYear}`;
  }

  return value;
}

function unixTimestamp(ms) {
  return Math.floor(ms / 1000);
}

module.exports = {
  getGermanDateTime,
  formatGermanDateTimeFromMs,
  getBerlinParts,
  getTomorrowBerlinParts,
  formatDateKeyGerman,
  addDaysToDateKey,
  parseGermanDateKey,
  normalizeGermanDateInput,
  repairBrokenGermanYear,
  unixTimestamp,
};
