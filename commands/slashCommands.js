const { storagePanelCommand } = require("../systems/storage");
const { familyPanelCommand } = require("../systems/familyPanel");
const { registrationPanelCommand } = require("../systems/registration");
const { leaderPanelCommand } = require("../systems/sanctions");

function getSlashCommands() {
  return [
    storagePanelCommand,
    familyPanelCommand,
    registrationPanelCommand,
    leaderPanelCommand,
  ];
}

function getSlashCommandJson() {
  return getSlashCommands().map((command) => command.toJSON());
}

module.exports = {
  getSlashCommands,
  getSlashCommandJson,
};
