const router = require("express").Router();

const requireAuth = require("../../middlewares/auth.middleware");
const validateBody = require("../../middlewares/validateBody");

const BalanceController = require("./balance.controller");
const balanceSchema = require("./balance.schema");
const balanceAdjustSchema = require("./balance.adjust.schema");
const balanceTransactionSchema = require("./balance.transaction.schema");

router.get("/", requireAuth, BalanceController.listBalances);

// Transactions across ALL balances (most recent first). Use ?limit=10 or ?limit=0 for all.
router.get("/transactions", requireAuth, BalanceController.listUserTransactions);
router.post("/", requireAuth, validateBody(balanceSchema), BalanceController.upsertBalance);

// Main API to record balance-related changes with description
router.post(
  "/transaction",
  requireAuth,
  validateBody(balanceTransactionSchema),
  BalanceController.addTransaction
);

// Show latest transactions (default 10) or all via ?limit=
router.get("/:id/transactions", requireAuth, BalanceController.listTransactions);

router.patch(
  "/:id/adjust",
  requireAuth,
  validateBody(balanceAdjustSchema),
  BalanceController.adjustBalance
);

module.exports = router;
