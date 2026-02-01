require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:5173",

  RDB_HOST: process.env.RDB_HOST || "127.0.0.1",
  RDB_PORT: Number(process.env.RDB_PORT || 28015),
  RDB_DB: process.env.RDB_DB || "money_ledger",

  JWT_SECRET: process.env.JWT_SECRET || "dev_secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // If true (default), the server will run idempotent DB migrations on startup.
  // Set AUTO_MIGRATE=false to disable.
  AUTO_MIGRATE: (process.env.AUTO_MIGRATE || "true").toLowerCase() !== "false",
};
