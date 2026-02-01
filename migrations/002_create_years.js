/*
  002_create_years

  Creates:
    - years table
    - years.userId secondary index (optional; useful for "created by" queries)
    - years.year secondary index (for global uniqueness and quick lookup by year)

  Schema (document fields):
    - userId: string (created by)
    - year: number (e.g., 2026)
    - monthsEnabled: number[] (1..12)
    - createdAt: ISO string
*/

module.exports = {
  id: "002_create_years",

  up: async (r) => {
    const tables = await r.tableList().run();
    if (!tables.includes("years")) {
      await r.tableCreate("years").run();
    }

    const indexes = await r.table("years").indexList().run();

    // Optional but fine to keep
    if (!indexes.includes("userId")) {
      await r.table("years").indexCreate("userId").run();
    }

    // ✅ Global lookup / uniqueness check by year
    if (!indexes.includes("year")) {
      await r.table("years").indexCreate("year").run();
    }

    // ❌ No longer needed for your current design
    // Keep it only if it already exists; we won't drop it here to avoid breaking environments.
    // We'll remove it in a dedicated follow-up migration if needed.

    await r.table("years").indexWait().run();
  },

  down: async (r) => {
    const tables = await r.tableList().run();
    if (tables.includes("years")) {
      await r.tableDrop("years").run();
    }
  },
};
