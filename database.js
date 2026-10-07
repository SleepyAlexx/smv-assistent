const { Pool } = require("pg");

const dbPool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : null;

async function dbQuery(query, params = []) {
  if (!dbPool) {
    throw new Error("DATABASE_URL ist nicht gesetzt.");
  }

  return dbPool.query(query, params);
}

async function initDatabase() {
  if (!dbPool) {
    console.warn("⚠️ DATABASE_URL ist nicht gesetzt. Datenbank wird übersprungen.");
    return;
  }

  await dbQuery("SELECT NOW()");

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS bot_meta (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS weekly_payments (
      id BIGSERIAL PRIMARY KEY,
      week_key TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT,
      paid_at BIGINT NOT NULL,
      batch_id TEXT,
      batch_week_keys JSONB DEFAULT '[]'::jsonb,
      log_message_id TEXT,
      removed BOOLEAN NOT NULL DEFAULT FALSE,
      removed_at BIGINT,
      removed_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (week_key, user_id)
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS weekly_summaries (
      week_key TEXT PRIMARY KEY,
      posted_at BIGINT NOT NULL,
      reason TEXT,
      paid_count INTEGER NOT NULL DEFAULT 0,
      unpaid_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS lineups (
      date_key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      message_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS football_events (
      event_id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      message_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS sanctions (
      sanction_id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      message_id TEXT,
      paid BOOLEAN NOT NULL DEFAULT FALSE,
      cancelled BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("✅ PostgreSQL-Datenbank verbunden und Tabellen vorbereitet.");
}

function hasDatabase() {
  return Boolean(dbPool);
}

module.exports = {
  dbPool,
  dbQuery,
  initDatabase,
  hasDatabase,
};
