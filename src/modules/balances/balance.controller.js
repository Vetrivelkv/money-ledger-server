const r = require("../../db/rethink");

const BALANCES_TABLE = "balances";
const TXN_TABLE = "balance_transactions";

function nowIso() {
  return new Date().toISOString();
}

function txnFromDelta(delta) {
  return delta >= 0
    ? { type: "CREDIT", amount: delta }
    : { type: "DEBIT", amount: Math.abs(delta) };
}

async function insertTxn({ balanceId, year, month, type, amount, description, source, userId }) {
  const doc = {
    balanceId,
    year,
    month,
    type,
    amount,
    description,
    source, // OPENING | CORRECTION | ADJUST | MANUAL | EXPENSE (later)
    userId,
    createdAt: nowIso(),
  };
  await r.table(TXN_TABLE).insert(doc).run();
  return doc;
}

/**
 * Notes:
 * - One balance row per (year, month)
 * - We keep currentBalance cached for fast reads
 * - Every balance-affecting change writes a balance_transactions row with description
 * - Later, expenses can update balances via transactions as well
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

  // GET /balances/:id/transactions?limit=10
  listTransactions: async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const { id } = req.params;
      const limit = req.query.limit ? Number(req.query.limit) : 10;

      let q = r
        .table(TXN_TABLE)
        .getAll(id, { index: "balanceId" })
        .orderBy(r.desc("createdAt"));

      if (Number.isFinite(limit) && limit > 0) {
        q = q.limit(limit);
      }

      const rows = await q.run();
      return res.json({ transactions: rows });
    } catch (err) {
      console.error("listTransactions error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },

  // POST /balances
  // Upsert openingBalance for (year, month)
  // Also writes OPENING (create) or CORRECTION (update) transaction row if delta != 0
  upsertBalance: async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const { year, month, openingBalance, description } = req.body;

      const existing = await r
        .table(BALANCES_TABLE)
        .getAll([year, month], { index: "year_month" })
        .nth(0)
        .default(null)
        .run();

      const now = nowIso();

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

        // Record OPENING transaction (only if openingBalance != 0)
        if (openingBalance !== 0) {
          await insertTxn({
            balanceId: id,
            year,
            month,
            type: "CREDIT",
            amount: openingBalance,
            description: description || "Opening balance",
            source: "OPENING",
            userId,
          });
        }

        return res.status(201).json({
          balance: { ...doc, id },
        });
      }

      const oldOpening = Number(existing.openingBalance || 0);
      const newOpening = Number(openingBalance || 0);
      const openingDelta = newOpening - oldOpening;

      // Preserve all deltas already applied (manual + future expenses):
      // delta = currentBalance - openingBalance
      const delta = (existing.currentBalance || 0) - oldOpening;

      const updated = {
        openingBalance: newOpening,
        manualAdjustment: existing.manualAdjustment || 0,
        currentBalance: newOpening + delta,
        updatedAt: now,
      };

      await r.table(BALANCES_TABLE).get(existing.id).update(updated).run();

      // Record correction transaction if opening changed
      if (openingDelta !== 0) {
        const t = txnFromDelta(openingDelta);
        await insertTxn({
          balanceId: existing.id,
          year: existing.year,
          month: existing.month,
          type: t.type,
          amount: t.amount,
          description: description || "Opening balance correction",
          source: "CORRECTION",
          userId,
        });
      }

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

  // POST /balances/transaction
  // Add a manual transaction with description; auto-creates balances row if needed (openingBalance=0).
  addTransaction: async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const { year, month, type, amount, description } = req.body;
      const now = nowIso();

      // Ensure balance exists
      const existing = await r
        .table(BALANCES_TABLE)
        .getAll([year, month], { index: "year_month" })
        .nth(0)
        .default(null)
        .run();

      let balanceId = existing?.id;

      if (!balanceId) {
        const base = {
          userId,
          year,
          month,
          openingBalance: 0,
          manualAdjustment: 0,
          currentBalance: 0,
          createdAt: now,
          updatedAt: now,
        };
        const ins = await r.table(BALANCES_TABLE).insert(base, { returnChanges: true }).run();
        balanceId = ins.changes[0].new_val.id;
      }

      // Insert transaction first
      const txn = await insertTxn({
        balanceId,
        year,
        month,
        type,
        amount,
        description,
        source: "MANUAL",
        userId,
      });

      const signed = type === "CREDIT" ? amount : -amount;

      // Update cached balance and manualAdjustment so existing endpoints remain consistent
      const upd = await r
        .table(BALANCES_TABLE)
        .get(balanceId)
        .update((row) => ({
          manualAdjustment: row("manualAdjustment").default(0).add(signed),
          currentBalance: row("currentBalance").default(0).add(signed),
          updatedAt: now,
        }), { returnChanges: true })
        .run();

      const updatedBalance = upd?.changes?.[0]?.new_val;

      return res.status(201).json({
        balance: updatedBalance,
        transaction: txn,
      });
    } catch (err) {
      console.error("addTransaction error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },

  // PATCH /balances/:id/adjust
  // Adds a transaction row and applies delta to current balance.
  adjustBalance: async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });

      const { id } = req.params;
      const { delta, description } = req.body;

      const now = nowIso();

      // find balance for metadata
      const existing = await r.table(BALANCES_TABLE).get(id).run();
      if (!existing) return res.status(404).json({ message: "Balance not found" });

      // record transaction
      const t = txnFromDelta(delta);
      await insertTxn({
        balanceId: id,
        year: existing.year,
        month: existing.month,
        type: t.type,
        amount: t.amount,
        description,
        source: "ADJUST",
        userId,
      });

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
