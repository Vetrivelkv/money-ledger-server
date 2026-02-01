const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const env = require("./config/env");
const userRoutes = require("./modules/users/user.routes");
const yearRoutes = require("./modules/years/year.routes");

const authRoutes = require("./routes/auth.routes");
const { runMigrations } = require("./db/migrate");

const app = express();

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/years", yearRoutes);

async function start() {
  try {
    // Auto-run migrations on startup
    await runMigrations();

    app.listen(env.PORT, () => {
      console.log(`Server running on http://localhost:${env.PORT}`);
    });
  } catch (err) {
    console.error("Startup failed (migrations).", err);
    process.exit(1);
  }
}

start();
