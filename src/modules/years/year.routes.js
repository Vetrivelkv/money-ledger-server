const router = require("express").Router();

const requireAuth = require("../../middlewares/auth.middleware");
const validateBody = require("../../middlewares/validateBody");

const YearController = require("./year.controller");
const yearSchema = require("./year.schema");

router.get("/", requireAuth, YearController.listYears);
router.post("/", requireAuth, validateBody(yearSchema), YearController.createYear);

module.exports = router;
