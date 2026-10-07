function cleanName(input) {
  return String(input || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatMoney(amount) {
  return `${Number(amount || 0).toLocaleString("de-DE")}$`;
}

function chunkText(text, maxLength = 1000) {
  if (!text || text.length <= maxLength) return [text || "—"];

  const lines = String(text).split("\n");
  const chunks = [];
  let current = "";

  for (const line of lines) {
    if ((current + "\n" + line).length > maxLength) {
      chunks.push(current || "—");
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks : ["—"];
}

function truncate(text, max = 90) {
  const value = String(text || "");
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function getReadableUserName(member, user) {
  if (member?.displayName && !member.displayName.startsWith("<@")) {
    return member.displayName;
  }

  if (user?.globalName) return user.globalName;
  if (user?.username) return user.username;
  if (user?.tag) return user.tag;

  return "Unbekannter User";
}

function getMemberName(member, userId) {
  if (member?.displayName) return member.displayName;
  return `<@${userId}>`;
}

function createShortId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeItemName(input) {
  return String(input || "")
    .trim()
    .replace(/\s+/g, " ");
}

function createStorageItemId(name) {
  return normalizeItemName(name)
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function normalizeCategoryId(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

module.exports = {
  cleanName,
  formatMoney,
  chunkText,
  truncate,
  getReadableUserName,
  getMemberName,
  createShortId,
  normalizeItemName,
  createStorageItemId,
  normalizeCategoryId,
};
