require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ],
});

client.once("clientReady", () => {
  console.log(`✅ SMV-Assistent ist online als ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
