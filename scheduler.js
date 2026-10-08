const {
  checkDailyLineup,
  checkLineupReminders,
  checkLineupClosures,
} = require("./systems/lineup");

const { checkOverdueSanctions } = require("./systems/sanctions");
const { cleanupExpiredAbsences, scanOldBotAbsences } = require("./systems/absences");

let schedulerInterval = null;
let initialRunDone = false;

async function runSchedulerOnce(client, reason = "interval") {
  try {
    await checkDailyLineup(client);
  } catch (error) {
    console.error(`❌ Scheduler-Fehler bei checkDailyLineup (${reason}):`, error);
  }

  try {
    await checkLineupReminders(client);
  } catch (error) {
    console.error(`❌ Scheduler-Fehler bei checkLineupReminders (${reason}):`, error);
  }

  try {
    await checkLineupClosures(client);
  } catch (error) {
    console.error(`❌ Scheduler-Fehler bei checkLineupClosures (${reason}):`, error);
  }

  try {
    await checkOverdueSanctions(client);
  } catch (error) {
    console.error(`❌ Scheduler-Fehler bei checkOverdueSanctions (${reason}):`, error);
  }

  try {
    await cleanupExpiredAbsences(client, { scanFirst: false });
  } catch (error) {
    console.error(`❌ Scheduler-Fehler bei cleanupExpiredAbsences (${reason}):`, error);
  }
}

async function runInitialChecks(client) {
  if (initialRunDone) return;
  initialRunDone = true;

  console.log("🔄 Starte initiale Bot-Prüfungen...");

  try {
    const scanResult = await scanOldBotAbsences(client, 1000);
    console.log(
      `✅ Abmeldungs-Scan abgeschlossen. Gescannte Nachrichten: ${scanResult.scanned}, neu übernommen: ${scanResult.added}`
    );
  } catch (error) {
    console.error("❌ Fehler beim initialen Abmeldungs-Scan:", error);
  }

  try {
    const cleanupResult = await cleanupExpiredAbsences(client, { scanFirst: false });
    console.log(
      `✅ Abmeldungs-Löschcheck abgeschlossen. Geprüft: ${cleanupResult.checked}, gelöscht: ${cleanupResult.deleted}, bereinigt: ${cleanupResult.missingCleaned}, fehlgeschlagen: ${cleanupResult.failed}`
    );
  } catch (error) {
    console.error("❌ Fehler beim initialen Abmeldungs-Löschcheck:", error);
  }

  try {
    await checkLineupClosures(client);
  } catch (error) {
    console.error("❌ Fehler beim initialen Aufstellungs-Schließcheck:", error);
  }

  try {
    await checkOverdueSanctions(client);
  } catch (error) {
    console.error("❌ Fehler beim initialen Sanktionscheck:", error);
  }

  console.log("✅ Initiale Bot-Prüfungen abgeschlossen.");

  // WICHTIG:
  // Beim Bot-Start werden bewusst KEINE Aufstellungen und KEINE Reminder nachträglich gesendet.
  // Dadurch kommt nach einem Railway-Deploy / Bot-Neustart keine alte Aufstellungserinnerung mehr.
}

function startScheduler(client) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  runInitialChecks(client).catch((error) => {
    console.error("❌ Fehler bei initialen Prüfungen:", error);
  });

  // Alle 60 Sekunden prüfen.
  schedulerInterval = setInterval(() => {
    runSchedulerOnce(client, "interval").catch((error) => {
      console.error("❌ Scheduler-Intervallfehler:", error);
    });
  }, 60 * 1000);

  console.log("✅ Scheduler gestartet.");
}

function stopScheduler() {
  if (!schedulerInterval) return;

  clearInterval(schedulerInterval);
  schedulerInterval = null;

  console.log("🛑 Scheduler gestoppt.");
}

module.exports = {
  startScheduler,
  stopScheduler,
  runSchedulerOnce,
  runInitialChecks,
};
