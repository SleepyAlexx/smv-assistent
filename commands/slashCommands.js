const { storagePanelCommand } = require("../systems/storage");

function getSlashCommands() {
  return [
    storagePanelCommand,
  ];
}

function getSlashCommandJson() {
  return getSlashCommands().map((command) => command.toJSON());
}

module.exports = {
  getSlashCommands,
  getSlashCommandJson,
};
