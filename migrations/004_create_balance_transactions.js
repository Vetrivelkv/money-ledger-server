/*
  004_create_balance_transactions

  Creates:
    - balance_transactions table
    - balance_transactions.balanceId index
    - balance_transactions.balanceId_createdAt compound index ([balanceId, createdAt])

  Notes:
    - Each balance change must write a transaction row with description
    - Later, expenses can also write transactions (source: "EXPENSE")
*/

module.exports = {
  id: "004_create_balance_transactions",

  up: async (r) => {
    const tables = await r.tableList().run();
    if (!tables.includes("balance_transactions")) {
      await r.tableCreate("balance_transactions").run();
    }

    const indexes = await r.table("balance_transactions").indexList().run();

    if (!indexes.includes("balanceId")) {
      await r.table("balance_transactions").indexCreate("balanceId").run();
    }

    if (!indexes.includes("balanceId_createdAt")) {
      await r.table("balance_transactions")
        .indexCreate("balanceId_createdAt", (row) => [row("balanceId"), row("createdAt")])
        .run();
    }

    await r.table("balance_transactions").indexWait().run();
  },

  down: async (r) => {
    const tables = await r.tableList().run();
    if (tables.includes("balance_transactions")) {
      await r.tableDrop("balance_transactions").run();
    }
  },
};
