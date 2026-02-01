// src/modules/users/user.controller.js
const bcrypt = require("bcrypt");
const r = require("../../db/rethink"); // adjust if your path differs

const USERS_TABLE = "users";

async function findUserByEmail(email) {
  return r
    .table(USERS_TABLE)
    .getAll(email, { index: "email" })
    .nth(0)
    .default(null)
    .run();
}

module.exports = {
  createUser: async (req, res) => {
    try {
      const { userName, email, password } = req.body;

      const normalizedEmail = String(email).toLowerCase().trim();
      const trimmedName = String(userName).trim();

      // extra safe normalization (schema already checks basics)
      if (!trimmedName) {
        return res.status(400).json({ message: "userName is required" });
      }

      const existing = await findUserByEmail(normalizedEmail);
      if (existing) {
        return res.status(409).json({ message: "Email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const userDoc = {
        userName: trimmedName,
        email: normalizedEmail,
        passwordHash,
        createdAt: new Date().toISOString(),
      };

      const result = await r.table(USERS_TABLE).insert(userDoc).run();
      const id = result.generated_keys?.[0];

      return res.status(201).json({
        user: {
          id,
          userName: userDoc.userName,
          email: userDoc.email,
          createdAt: userDoc.createdAt,
        },
      });
    } catch (err) {
      console.error("createUser error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
};
