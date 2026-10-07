const CONFIG = require("../config");
const { hasAnyRole } = require("../utils/permissions");

function isPayerExcludedUser(userId) {
  return CONFIG.payerExcludedUserIds.includes(userId);
}

function shouldHavePayerRole(member) {
  if (!member || !member.user) return false;

  const userId = member.user.id;

  if (member.user.bot) return false;
  if (isPayerExcludedUser(userId)) return false;
  if (!member.roles.cache.has(CONFIG.familyMemberRoleId)) return false;
  if (hasAnyRole(member, CONFIG.payerExemptRoleIds)) return false;

  return true;
}

async function syncPayerRole(member, reason = "Zahlende/r Rollenautomatik") {
  try {
    if (!member || member.user?.bot) return;

    const shouldHave = shouldHavePayerRole(member);
    const hasPayerRole = member.roles.cache.has(CONFIG.payerRoleId);

    if (shouldHave && !hasPayerRole) {
      await member.roles.add(CONFIG.payerRoleId, reason);
      console.log(`✅ Zahlende/r-Rolle vergeben an ${member.user.tag}`);
      return;
    }

    if (!shouldHave && hasPayerRole) {
      await member.roles.remove(CONFIG.payerRoleId, reason);
      console.log(`✅ Zahlende/r-Rolle entfernt bei ${member.user.tag}`);
    }
  } catch (error) {
    console.error(`❌ Fehler bei Zahlende/r-Rollenautomatik für ${member?.user?.tag || "unbekannt"}:`, error);
  }
}

async function syncAllPayerRoles(client, reason = "Bot-Start - Zahlende/r Prüfung") {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);

    if (!guild) {
      console.error("❌ Guild für Zahlende/r-Sync nicht gefunden.");
      return;
    }

    const members = await guild.members.fetch();

    let checked = 0;

    for (const member of members.values()) {
      if (member.user.bot) continue;

      const hasFamilyRole = member.roles.cache.has(CONFIG.familyMemberRoleId);
      const hasPayerRole = member.roles.cache.has(CONFIG.payerRoleId);
      const isExcluded = isPayerExcludedUser(member.user.id);
      const isExempt = hasAnyRole(member, CONFIG.payerExemptRoleIds);

      if (!hasFamilyRole && !hasPayerRole) continue;

      checked++;
      await syncPayerRole(member, reason);

      if (isExcluded || isExempt) {
        continue;
      }
    }

    console.log(`✅ Zahlende/r-Sync abgeschlossen. Geprüfte Mitglieder: ${checked}`);
  } catch (error) {
    console.error("❌ Fehler bei syncAllPayerRoles:", error);
  }
}

module.exports = {
  isPayerExcludedUser,
  shouldHavePayerRole,
  syncPayerRole,
  syncAllPayerRoles,
};
