const { storagePanelCommand } = require("../systems/storage");
const { familyPanelCommand } = require("../systems/familyPanel");

function getSlashCommands() {
  return [
    storagePanelCommand,
    familyPanelCommand,
  ];
}

function getSlashCommandJson() {
  return getSlashCommands().map((command) => command.toJSON());
}

module.exports = {
  getSlashCommands,
  getSlashCommandJson,
};
