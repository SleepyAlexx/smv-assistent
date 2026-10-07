const { handleStorageInteraction } = require("../systems/storage");
const { handleAbsenceInteraction } = require("../systems/absences");
const { handleFamilyPanelInteraction } = require("../systems/familyPanel");
const { handleFootballInteraction } = require("../systems/football");
const { handleRegistrationInteraction } = require("../systems/registration");
const { handleSanctionsInteraction } = require("../systems/sanctions");
const { handleLineupInteraction } = require("../systems/lineup");
const { handleWeeklyPaymentInteraction } = require("../systems/weeklyPayments");

async function handleInteraction(client, interaction) {
  try {
    if (await handleStorageInteraction(client, interaction)) return;
    if (await handleAbsenceInteraction(client, interaction)) return;
    if (await handleFamilyPanelInteraction(client, interaction)) return;
    if (await handleFootballInteraction(client, interaction)) return;
    if (await handleRegistrationInteraction(client, interaction)) return;
    if (await handleSanctionsInteraction(client, interaction)) return;
    if (await handleLineupInteraction(client, interaction)) return;
    if (await handleWeeklyPaymentInteraction(client, interaction)) return;
  } catch (error) {
    console.error("❌ Fehler bei interactionCreate:", error);

    const payload = {
      content: "❌ Es ist ein Fehler aufgetreten. Bitte versuche es nochmal oder melde es der Leaderschaft.",
      ephemeral: true,
    };

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    } catch (replyError) {
      console.error("❌ Fehlerantwort konnte nicht gesendet werden:", replyError);
    }
  }
}

module.exports = {
  handleInteraction,
};
