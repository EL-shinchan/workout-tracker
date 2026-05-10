const express = require("express");
const {
  allowedTimezones,
  readConfig,
  updatePhotoProcessorConfig,
  timeToCron
} = require("../services/configStore");

const router = express.Router();

router.get("/", (req, res) => {
  const config = readConfig();
  res.json({
    config,
    allowedTimezones: Array.from(allowedTimezones),
    derived: {
      cronExpr: timeToCron(config.photoProcessor.time)
    }
  });
});

router.put("/", (req, res) => {
  try {
    const result = updatePhotoProcessorConfig(req.body.photoProcessor || {});
    res.json({
      message: "Config saved and OpenClaw cron synced.",
      ...result
    });
  } catch (error) {
    res.status(400).json({ message: error.message || "Could not save config." });
  }
});

module.exports = router;
