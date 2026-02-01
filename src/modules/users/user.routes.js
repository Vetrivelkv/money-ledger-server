// src/modules/users/user.routes.js
const router = require("express").Router();

const validateBody = require("../../middlewares/validateBody");
const userSchema = require("./user.schema");
const UserController = require("./user.controller");

// POST /users
router.post("/", validateBody(userSchema), UserController.createUser);

module.exports = router;
