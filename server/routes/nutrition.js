const express = require("express");
const { askGemini } = require("../services/geminiChat");
const { getActiveUserId } = require("../services/userStore");
const {
  createEntry,
  daySummary,
  deleteEntry,
  normalizeDate,
  saveGoals
} = require("../services/nutritionStore");

const router = express.Router();
const ESTIMATE_UNAVAILABLE_MESSAGE = "Coach Fox estimate is unavailable right now. Enter macros manually.";

function parseEstimateJson(text) {
  const raw = String(text || "").trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Estimate response was not JSON.");
  }

  const data = JSON.parse(jsonMatch[0]);
  return {
    foodName: String(data.foodName || "").trim(),
    calories: Number(data.calories || 0),
    protein: Number(data.protein || 0),
    carbs: Number(data.carbs || 0),
    fat: Number(data.fat || 0),
    note: String(data.note || "Estimate only. Check labels when possible.").trim()
  };
}

function normalizeEstimate(data, fallbackName) {
  return {
    foodName: data.foodName || fallbackName,
    calories: Math.max(0, Math.round(Number(data.calories || 0))),
    protein: Math.max(0, Math.round(Number(data.protein || 0) * 10) / 10),
    carbs: Math.max(0, Math.round(Number(data.carbs || 0) * 10) / 10),
    fat: Math.max(0, Math.round(Number(data.fat || 0) * 10) / 10),
    note: data.note || "Estimate only. Check labels when possible."
  };
}

router.get("/day", (req, res) => {
  const activeUserId = getActiveUserId();
  return res.json(daySummary(activeUserId, normalizeDate(req.query.date)));
});

router.put("/goals", (req, res) => {
  try {
    const activeUserId = getActiveUserId();
    const goals = saveGoals(activeUserId, req.body || {});
    return res.json({ goals, message: "Nutrition goals saved." });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not save goals." });
  }
});

router.post("/entries", (req, res) => {
  try {
    const activeUserId = getActiveUserId();
    const entry = createEntry(activeUserId, req.body || {});
    return res.status(201).json({ entry, day: daySummary(activeUserId, entry.entryDate), message: "Food entry saved." });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not save food entry." });
  }
});

router.delete("/entries/:id", (req, res) => {
  const activeUserId = getActiveUserId();
  const deleted = deleteEntry(activeUserId, req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: "Food entry not found." });
  }

  return res.json({ message: "Food entry deleted." });
});

router.post("/estimate", async (req, res) => {
  const description = String(req.body.description || "").trim();
  if (!description) {
    return res.status(400).json({ message: "Describe the food first." });
  }

  if (description.length > 400) {
    return res.status(400).json({ message: "Keep food estimates under 400 characters." });
  }

  const prompt = `Estimate nutrition macros for this food description: "${description}".
Return ONLY valid compact JSON with these keys: foodName, calories, protein, carbs, fat, note.
Use grams for protein/carbs/fat. Calories should be kcal.
If uncertain, make a reasonable common-serving estimate and say "Estimate only. Check labels when possible." in note.`;

  try {
    const reply = await askGemini(prompt);
    return res.json(normalizeEstimate(parseEstimateJson(reply), description));
  } catch (_error) {
    return res.status(503).json({ message: ESTIMATE_UNAVAILABLE_MESSAGE });
  }
});

module.exports = router;
