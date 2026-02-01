const rethinkdbdash = require("rethinkdbdash");
const env = require("../config/env");

const r = rethinkdbdash({
  host: env.RDB_HOST,
  port: env.RDB_PORT,
  db: env.RDB_DB,
  silent: true,
});

module.exports = r;
