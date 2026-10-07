async function sendToChannel(client, channelId, payload) {
  if (!client || !channelId) {
    console.error("❌ sendToChannel: Client oder Channel-ID fehlt.");
    return null;
  }

  const channel = await client.channels.fetch(channelId).catch((error) => {
    console.error(`❌ Channel konnte nicht geladen werden: ${channelId}`, error);
    return null;
  });

  if (!channel) {
    console.error(`❌ Channel nicht gefunden: ${channelId}`);
    return null;
  }

  if (!channel.isTextBased || !channel.isTextBased()) {
    console.error(`❌ Channel ist kein Textchannel: ${channelId}`);
    return null;
  }

  return await channel.send(payload).catch((error) => {
    console.error(`❌ Nachricht konnte nicht gesendet werden in Channel ${channelId}:`, error);
    return null;
  });
}

async function safeReply(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.followUp(payload);
    }

    return await interaction.reply(payload);
  } catch (error) {
    console.error("❌ Fehler bei safeReply:", error);
    return null;
  }
}

async function safeEditReply(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    }

    return await interaction.reply(payload);
  } catch (error) {
    console.error("❌ Fehler bei safeEditReply:", error);
    return null;
  }
}

async function safeDeferReply(interaction, options = { ephemeral: true }) {
  try {
    if (interaction.deferred || interaction.replied) return true;
    await interaction.deferReply(options);
    return true;
  } catch (error) {
    console.error("❌ Fehler bei safeDeferReply:", error);
    return false;
  }
}

async function fetchMessage(channel, messageId) {
  if (!channel || !messageId || !channel.messages) return null;

  return await channel.messages.fetch(messageId).catch((error) => {
    // DiscordAPIError[10008] = Unknown Message
    if (error?.code === 10008) return null;

    console.error(`❌ Nachricht konnte nicht geladen werden: ${messageId}`, error);
    return null;
  });
}

async function deleteMessageSafe(message, reason = "Nachricht automatisch gelöscht") {
  if (!message) {
    return {
      ok: false,
      missing: true,
      error: null,
    };
  }

  try {
    await message.delete(reason);
    return {
      ok: true,
      missing: false,
      error: null,
    };
  } catch (error) {
    // DiscordAPIError[10008] = Unknown Message
    if (error?.code === 10008) {
      return {
        ok: false,
        missing: true,
        error: null,
      };
    }

    console.error("❌ Nachricht konnte nicht gelöscht werden:", error);

    return {
      ok: false,
      missing: false,
      error,
    };
  }
}

module.exports = {
  sendToChannel,
  safeReply,
  safeEditReply,
  safeDeferReply,
  fetchMessage,
  deleteMessageSafe,
};
