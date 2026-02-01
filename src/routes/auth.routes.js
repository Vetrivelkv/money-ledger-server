const router = require("express").Router();
const Auth = require("../controllers/auth.controller");
const requireAuth = require("../middlewares/auth.middleware");

router.post("/register", Auth.register);
router.post("/login", Auth.login);
router.post("/logout", Auth.logout);
router.get("/me", requireAuth, Auth.me);

module.exports = router;
