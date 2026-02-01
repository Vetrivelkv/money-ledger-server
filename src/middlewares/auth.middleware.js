const jwt = require("jsonwebtoken");
const env = require("../config/env");

// Sliding session: if token is close to expiry AND user is active, re-issue a new token.
// This extends the session while the user keeps using the app.
function shouldRefresh(payload) {
  if (!payload?.exp) return false;
  const nowMs = Date.now();
  const expMs = payload.exp * 1000;
  const remainingMs = expMs - nowMs;

  const thresholdMs = env.SESSION_REFRESH_THRESHOLD_MINUTES * 60 * 1000;
  return remainingMs > 0 && remainingMs <= thresholdMs;
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

module.exports = function requireAuth(req, res, next) {
  const token = req.cookies?.ml_token;
  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;

    // Sliding refresh
    if (shouldRefresh(payload)) {
      const refreshedToken = jwt.sign(
        { userId: payload.userId, email: payload.email, userName: payload.userName },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN },
      );
      setAuthCookie(res, refreshedToken);
    }

    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
