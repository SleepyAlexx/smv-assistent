// =====================================================
// SMV-Assistent | index.js
// Zentrale Startdatei
// =====================================================

require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  ActivityType,
  REST,
  Routes,
} = require("discord.js");

const CONFIG = require("./config");
const { initDatabase } = require("./database");
const { getSlashCommandJson } = require("./commands/slashCommands");
const { handleInteraction } = require("./handlers/interactions");
const { startScheduler } = require("./scheduler");

const {
  sendWelcomeMessage,
  sendLeaveMessage,
} = require("./systems/registration");

const {
  syncPayerRole,
  syncAllPayerRoles,
} = require("./systems/payerRoles");

// =====================================================
// ENV-CHECK
// =====================================================

function checkEnv() {
  const requiredEnv = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID"];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);

  if (missingEnv.length > 0) {
    console.error("❌ Fehlende Railway/.env Variablen:", missingEnv.join(", "));
    process.exit(1);
  }

  console.log("✅ Alle wichtigen Variablen wurden gefunden.");
}

// =====================================================
// CLIENT
// =====================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// =====================================================
// SLASH COMMANDS REGISTRIEREN
// =====================================================

async function registerSlashCommands() {
  try {
    const commands = getSlashCommandJson();

    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    console.log(`🔄 Registriere ${commands.length} Slash Commands...`);

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      {
        body: commands,
      }
    );

    console.log("✅ Slash Commands wurden registriert.");
  } catch (error) {
    console.error("❌ Slash Commands konnten nicht registriert werden:", error);
  }
}

// =====================================================
// READY
// =====================================================

client.once("ready", async () => {
  console.log(`✅ Eingeloggt als ${client.user.tag}`);

  client.user.setPresence({
    activities: [
      {
        name: `${CONFIG.familyName}`,
        type: ActivityType.Watching,
      },
    ],
    status: "online",
  });

  await initDatabase();
  await registerSlashCommands();

  await syncAllPayerRoles(client, "Bot-Start - Zahlende/r Prüfung");

  startScheduler(client);

  console.log(`✅ ${CONFIG.botName} ist vollständig gestartet.`);
});

// =====================================================
// EVENTS
// =====================================================

client.on("interactionCreate", async (interaction) => {
  await handleInteraction(client, interaction);
});

client.on("guildMemberAdd", async (member) => {
  try {
    await sendWelcomeMessage(client, member);
    await syncPayerRole(member, "Member Join - Zahlende/r Prüfung");
  } catch (error) {
    console.error("❌ Fehler bei guildMemberAdd:", error);
  }
});

client.on("guildMemberRemove", async (member) => {
  try {
    await sendLeaveMessage(client, member);
  } catch (error) {
    console.error("❌ Fehler bei guildMemberRemove:", error);
  }
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  try {
    await syncPayerRole(newMember, "Rollenänderung - Zahlende/r Prüfung");
  } catch (error) {
    console.error("❌ Fehler bei guildMemberUpdate:", error);
  }
});

client.on("error", (error) => {
  console.error("❌ Discord Client Error:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled Rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
});

// =====================================================
// START
// =====================================================

checkEnv();

client.login(process.env.DISCORD_TOKEN);
