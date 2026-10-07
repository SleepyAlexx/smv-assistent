const { storagePanelCommand } = require("../systems/storage");
const { familyPanelCommand } = require("../systems/familyPanel");
const { registrationPanelCommand } = require("../systems/registration");

function getSlashCommands() {
  return [
    storagePanelCommand,
    familyPanelCommand,
    registrationPanelCommand,
  ];
}

function getSlashCommandJson() {
  return getSlashCommands().map((command) => command.toJSON());
}

module.exports = {
  getSlashCommands,
  getSlashCommandJson,
};
