/*
  003_create_balances

  Creates:
    - balances table
    - balances.year secondary index
    - balances.year_month compound index ( [year, month] )

  Schema (document fields):
    - userId: string (created by)
    - year: number (e.g., 2026)
    - month: number (1..12)
    - openingBalance: number
    - manualAdjustment: number (default 0)
    - currentBalance: number
    - createdAt: ISO string
    - updatedAt: ISO string
*/

module.exports = {
  id: "003_create_balances",

  up: async (r) => {
    const tables = await r.tableList().run();
    if (!tables.includes("balances")) {
      await r.tableCreate("balances").run();
    }

    const indexes = await r.table("balances").indexList().run();

    if (!indexes.includes("year")) {
      await r.table("balances").indexCreate("year").run();
    }

    if (!indexes.includes("year_month")) {
      await r.table("balances")
        .indexCreate("year_month", (row) => [row("year"), row("month")])
        .run();
    }

    await r.table("balances").indexWait().run();

    // Backfill manualAdjustment for existing rows (safe if none exist)
    await r.table("balances")
      .update((row) => ({
        manualAdjustment: row("manualAdjustment").default(0),
      }))
      .run();
  },

  down: async (r) => {
    const tables = await r.tableList().run();
    if (tables.includes("balances")) {
      await r.tableDrop("balances").run();
    }
  },
};
