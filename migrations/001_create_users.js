/*
  001_create_users

  Creates:
    - users table
    - users.email secondary index

  Schema (document fields):
    - userName: string
    - email: string (unique, indexed)
    - passwordHash: string
    - createdAt: ISO string
*/

module.exports = {
  id: "001_create_users",

  up: async (r) => {
    const tables = await r.tableList().run();
    if (!tables.includes("users")) {
      await r.tableCreate("users").run();
    }

    const indexes = await r.table("users").indexList().run();
    if (!indexes.includes("email")) {
      await r.table("users").indexCreate("email").run();
      await r.table("users").indexWait("email").run();
    }
  },

  // Optional, but included for completeness
  down: async (r) => {
    const tables = await r.tableList().run();
    if (tables.includes("users")) {
      await r.tableDrop("users").run();
    }
  },
};
