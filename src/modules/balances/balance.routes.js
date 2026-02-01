const router = require("express").Router();

const requireAuth = require("../../middlewares/auth.middleware");
const validateBody = require("../../middlewares/validateBody");

const BalanceController = require("./balance.controller");
const balanceSchema = require("./balance.schema");
const balanceAdjustSchema = require("./balance.adjust.schema");

router.get("/", requireAuth, BalanceController.listBalances);
router.post("/", requireAuth, validateBody(balanceSchema), BalanceController.upsertBalance);
router.patch("/:id/adjust", requireAuth, validateBody(balanceAdjustSchema), BalanceController.adjustBalance);

module.exports = router;
