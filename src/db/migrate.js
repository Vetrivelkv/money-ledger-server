const path = require("path");
const fs = require("fs");
const rethinkdbdash = require("rethinkdbdash");
const env = require("../config/env");

/**
 * Auto-migration runner.
 * - Creates DB if missing
 * - Creates `migrations` table if missing
 * - Executes any migration files not yet marked success
 * - Records result (success/false) with script name + error
 */
function loadMigrations() {
  const dir = path.join(__dirname, "..", "..", "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".js"))
    .sort();

  return files.map((file) => {
    const mod = require(path.join(dir, file));
    if (!mod || !mod.id || typeof mod.up !== "function") {
      throw new Error(
        `Invalid migration: ${file}. Expected exports { id: string, up: function }`
      );
    }
    return { file, ...mod };
  });
}

async function ensureDbAndMigrationsTable(rAdmin) {
  const dbs = await rAdmin.dbList().run();
  if (!dbs.includes(env.RDB_DB)) {
    console.log(`[migrate] Creating database: ${env.RDB_DB}`);
    await rAdmin.dbCreate(env.RDB_DB).run();
  }

  const tables = await rAdmin.db(env.RDB_DB).tableList().run();
  if (!tables.includes("migrations")) {
    console.log("[migrate] Creating table: migrations");
    await rAdmin
      .db(env.RDB_DB)
      .tableCreate("migrations", { primaryKey: "name" })
      .run();
    
// Helpful index for reporting
const idx = await rAdmin.db(env.RDB_DB).table("migrations").indexList().run();
if (!idx.includes("success")) {
  await rAdmin.db(env.RDB_DB).table("migrations").indexCreate("success").run();
  await rAdmin.db(env.RDB_DB).table("migrations").indexWait("success").run();
}
  }
}

async function getSuccessfulMigrationNames(rAdmin) {
  const rows = await rAdmin
    .db(env.RDB_DB)
    .table("migrations")
    .getAll(true, { index: "success" })
    .pluck("name")
    .run();

  return new Set(rows.map((r) => r.name));
}

async function upsertMigrationResult(rAdmin, { name, migrationId, success, error }) {
  const doc = {
    name,
    migrationId,
    success: Boolean(success),
    error: error || null,
    executedAt: new Date().toISOString(),
  };

  // primaryKey = name, so insert with conflict=replace is an upsert
  await rAdmin
    .db(env.RDB_DB)
    .table("migrations")
    .insert(doc, { conflict: "replace" })
    .run();
}

async function runMigrations() {
  // admin connection (no default db needed for dbCreate/dbList)
  const rAdmin = rethinkdbdash({
    host: env.RDB_HOST,
    port: env.RDB_PORT,
    silent: true,
  });

  try {
    await ensureDbAndMigrationsTable(rAdmin);

    const migrations = loadMigrations();
    const successful = await getSuccessfulMigrationNames(rAdmin);

    // DB connection (uses app DB as default)
    const rDb = rethinkdbdash({
      host: env.RDB_HOST,
      port: env.RDB_PORT,
      db: env.RDB_DB,
      silent: true,
    });

    for (const m of migrations) {
      if (successful.has(m.file)) {
        continue;
      }

      console.log(`[migrate] Running ${m.file} (${m.id})`);
      try {
        await m.up(rDb);
        await upsertMigrationResult(rAdmin, {
          name: m.file,
          migrationId: m.id,
          success: true,
          error: null,
        });
        console.log(`[migrate] ✅ ${m.file} success`);
      } catch (err) {
        await upsertMigrationResult(rAdmin, {
          name: m.file,
          migrationId: m.id,
          success: false,
          error: err?.stack || String(err),
        });
        console.error(`[migrate] ❌ ${m.file} failed`);
        throw err;
      }
    }

    return { ok: true };
  } finally {
    // close pools
    try { await rAdmin.getPoolMaster().drain(); } catch (_) {}
  }
}

module.exports = { runMigrations };
