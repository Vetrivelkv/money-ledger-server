const { runMigrations } = require("../src/db/migrate");

runMigrations()
  .then(() => {
    console.log("Migrations complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migrations failed.", err);
    process.exit(1);
  });
