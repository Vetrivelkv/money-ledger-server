const r = require("../../db/rethink");

const BALANCES_TABLE = "balances";

/**
 * Notes:
 * - One balance row per (year, month)
 * - openingBalance: "starting value" user sets
 * - manualAdjustment: user can add/subtract later without breaking expense math
 * - currentBalance is stored and updated incrementally for fast reads
 */

module.exports = {
  // GET /balances?year=2026
  listBalances: async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const year = Number(req.query.year);
      if (!year) return res.status(400).json({ message: "year is required" });

      const rows = await r
        .table(BALANCES_TABLE)
        .getAll(year, { index: "year" })
        .orderBy("month")
        .run();

      return res.json({
        balances: rows.map((b) => ({
          id: b.id,
          userId: b.userId,
          year: b.year,
          month: b.month,
          openingBalance: b.openingBalance,
          manualAdjustment: b.manualAdjustment || 0,
          currentBalance: b.currentBalance,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        })),
      });
    } catch (err) {
      console.error("listBalances error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },

  // POST /balances
  // Upsert openingBalance for (year, month)
  upsertBalance: async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const { year, month, openingBalance } = req.body;

      const existing = await r
        .table(BALANCES_TABLE)
        .getAll([year, month], { index: "year_month" })
        .nth(0)
        .default(null)
        .run();

      const now = new Date().toISOString();

      if (!existing) {
        const doc = {
          userId, // creator only (display)
          year,
          month,
          openingBalance,
          manualAdjustment: 0,
          currentBalance: openingBalance,
          createdAt: now,
          updatedAt: now,
        };

        const result = await r.table(BALANCES_TABLE).insert(doc).run();
        const id = result.generated_keys?.[0];

        return res.status(201).json({
          balance: { ...doc, id },
        });
      }

      // Preserve all deltas already applied (manual + future expenses):
      // delta = currentBalance - openingBalance
      const delta = (existing.currentBalance || 0) - (existing.openingBalance || 0);
      const updated = {
        openingBalance,
        // keep existing manualAdjustment (default 0 if missing)
        manualAdjustment: existing.manualAdjustment || 0,
        currentBalance: openingBalance + delta,
        updatedAt: now,
      };

      await r.table(BALANCES_TABLE).get(existing.id).update(updated).run();

      return res.json({
        balance: {
          id: existing.id,
          userId: existing.userId,
          year: existing.year,
          month: existing.month,
          openingBalance: updated.openingBalance,
          manualAdjustment: updated.manualAdjustment,
          currentBalance: updated.currentBalance,
          createdAt: existing.createdAt,
          updatedAt: updated.updatedAt,
        },
      });
    } catch (err) {
      console.error("upsertBalance error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },

  // PATCH /balances/:id/adjust
  adjustBalance: async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const { id } = req.params;
      const { delta } = req.body;

      const now = new Date().toISOString();

      const result = await r
        .table(BALANCES_TABLE)
        .get(id)
        .update((row) => ({
          manualAdjustment: row("manualAdjustment").default(0).add(delta),
          currentBalance: row("currentBalance").default(0).add(delta),
          updatedAt: now,
        }), { returnChanges: true })
        .run();

      const updated = result?.changes?.[0]?.new_val;
      if (!updated) return res.status(404).json({ message: "Balance not found" });

      return res.json({
        balance: {
          id: updated.id,
          userId: updated.userId,
          year: updated.year,
          month: updated.month,
          openingBalance: updated.openingBalance,
          manualAdjustment: updated.manualAdjustment || 0,
          currentBalance: updated.currentBalance,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      });
    } catch (err) {
      console.error("adjustBalance error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
};
