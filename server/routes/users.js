const express = require("express");
const { listUsers, getActiveUser, setActiveUserId } = require("../services/userStore");

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({ users: listUsers(), activeUser: getActiveUser() });
});

router.put("/active", (req, res) => {
  try {
    const user = setActiveUserId(req.body.userId);
    return res.json({ activeUser: user, users: listUsers(), message: `Switched to ${user.name}.` });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not switch user." });
  }
});

module.exports = router;
