const express = require("express");
const { askGemini } = require("../services/geminiChat");

const router = express.Router();
const MAX_MESSAGE_LENGTH = 800;
const AI_UNAVAILABLE_MESSAGE = "Coach Fox AI is unavailable right now. Local basics still work.";

function safeMedicalReply(message) {
  const text = String(message || "").toLowerCase();
  if (!/pain|injur|hurt|sick|ill|allerg|vomit|dizzy|faint|fever|breath|chest|medical|doctor|medicine|medication/.test(text)) {
    return null;
  }

  if (/chest|breath|faint|severe|numb|can't walk|can’t walk|cant walk|cannot walk|high fever/.test(text)) {
    return "That sounds serious — please tell an adult now and get medical help quickly. Stop training, rest somewhere safe, and don’t try to push through it. Coach Fox can help with basics, but this needs real-world help.";
  }

  return "Ouch — sorry you’re dealing with that. Stop hard training for now, rest, hydrate if you’re sick, and avoid anything that makes it worse. If it’s sharp, swelling, getting worse, unusual, or doesn’t improve, tell an adult and get checked by a doctor, physio, or coach.";
}

router.post("/", async (req, res) => {
  const message = String(req.body.message || "").trim();

  if (!message) {
    return res.status(400).json({ message: "Ask Coach Fox a question first." });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ message: "Keep Coach Fox questions under 800 characters." });
  }

  const medicalReply = safeMedicalReply(message);
  if (medicalReply) {
    return res.json({ reply: medicalReply, source: "safety" });
  }

  try {
    const reply = await askGemini(message);
    return res.json({ reply, source: "gemini" });
  } catch (_error) {
    return res.status(503).json({ message: AI_UNAVAILABLE_MESSAGE });
  }
});

module.exports = router;
