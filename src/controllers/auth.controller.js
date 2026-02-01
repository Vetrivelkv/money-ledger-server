const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const r = require("../db/rethink");
const env = require("../config/env");

const USERS_TABLE = "users";

// NOTE:
// Tables/indexes are created via migration scripts.
// Keep runtime code free of auto-creation logic so environments are consistent.

function createAuthToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, userName: user.userName },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );
}

function setAuthCookie(res, token) {
  const maxAgeMs = env.SESSION_TTL_MINUTES * 60 * 1000;

  res.cookie("ml_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true when using HTTPS in production
    maxAge: maxAgeMs,
  });
}

module.exports = {
  register: async (req, res) => {
    try {
      const { email, password, confirmPassword, userName } = req.body;

      if (!email || !password || !confirmPassword) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      const normalizedEmail = String(email).toLowerCase().trim();

      const existing = await r
        .table(USERS_TABLE)
        .getAll(normalizedEmail, { index: "email" })
        .nth(0)
        .default(null)
        .run();

      if (existing) {
        return res.status(409).json({ message: "Email already in use" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const safeUserName =
        (userName && String(userName).trim()) || normalizedEmail.split("@")[0];

      const user = {
        userName: safeUserName,
        email: normalizedEmail,
        passwordHash,
        createdAt: new Date().toISOString(),
      };

      const insertResult = await r.table(USERS_TABLE).insert(user).run();
      const userId = insertResult.generated_keys[0];

      // Include generated id so downstream token payload is consistent
      const createdUser = { ...user, id: userId };

      const token = createAuthToken(createdUser);

      setAuthCookie(res, token);
      return res.status(201).json({
        user: { id: userId, email: createdUser.email, userName: createdUser.userName },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Missing credentials" });
      }

      const normalizedEmail = String(email).toLowerCase().trim();

      const user = await r
        .table(USERS_TABLE)
        .getAll(normalizedEmail, { index: "email" })
        .nth(0)
        .default(null)
        .run();

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = createAuthToken(user);

      setAuthCookie(res, token);
      return res.json({
        user: { id: user.id, email: user.email, userName: user.userName },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  },

  logout: async (req, res) => {
    res.clearCookie("ml_token");
    return res.json({ ok: true });
  },

  me: async (req, res) => {
    // req.user set by middleware
    return res.json({ user: req.user });
  },
};
