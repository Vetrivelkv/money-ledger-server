const jwt = require("jsonwebtoken");
const env = require("../config/env");

module.exports = function requireAuth(req, res, next) {
  const token = req.cookies?.ml_token;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
