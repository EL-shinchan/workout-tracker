const express = require("express");
const {
  createAccount,
  verifyUserPassword,
  createSession,
  getRequestSession,
  deleteSession,
  deleteAccount,
  setSessionCookie,
  clearSessionCookie,
  SESSION_COOKIE
} = require("../services/authStore");

const router = express.Router();

router.get("/me", (req, res) => {
  const session = getRequestSession(req);
  if (!session) {
    return res.status(401).json({ message: "Login required." });
  }

  return res.json({ user: session.user, expiresAt: session.expiresAt });
});

router.post("/login", (req, res) => {
  const name = String(req.body.name || "").trim();
  const password = String(req.body.password || "");

  const user = verifyUserPassword(name, password);
  if (!user) {
    return res.status(401).json({ message: "Wrong name or password." });
  }

  const session = createSession(user.id);
  setSessionCookie(res, session.token);
  return res.json({ user: { id: user.id, name: user.name }, message: `Welcome back, ${user.name}.` });
});

router.post("/signup", (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const password = String(req.body.password || "");
    const user = createAccount(name, password);
    const session = createSession(user.id);
    setSessionCookie(res, session.token);
    return res.status(201).json({ user, message: `Account created. Welcome, ${user.name}.` });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not create account." });
  }
});

router.delete("/account", (req, res) => {
  try {
    const session = getRequestSession(req);
    if (!session) {
      return res.status(401).json({ message: "Login required." });
    }

    const password = String(req.body.password || "");
    const deleted = deleteAccount(session.user.id, password);
    clearSessionCookie(res);
    return res.json({ message: `${deleted.name} account deleted.` });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not delete account." });
  }
});

router.post("/logout", (req, res) => {
  const cookie = String(req.headers.cookie || "");
  const tokenPair = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const token = tokenPair ? decodeURIComponent(tokenPair.split("=").slice(1).join("=")) : "";
  deleteSession(token);
  clearSessionCookie(res);
  return res.json({ message: "Logged out." });
});

module.exports = router;
