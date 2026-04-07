const express = require("express");
const db = require("../db/database");

const router = express.Router();

router.get("/", (req, res) => {
  const exercises = db
    .prepare(
      `SELECT id, name, muscle_group AS muscleGroup, category, created_at AS createdAt
       FROM exercises
       ORDER BY name COLLATE NOCASE ASC`
    )
    .all();

  res.json({ exercises });
});

router.post("/", (req, res) => {
  const name = String(req.body.name || "").trim();
  const muscleGroup = String(req.body.muscleGroup || "").trim();
  const category = String(req.body.category || "").trim();

  if (!name) {
    return res.status(400).json({ message: "Exercise name is required." });
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO exercises (name, muscle_group, category)
         VALUES (?, ?, ?)`
      )
      .run(name, muscleGroup, category);

    const exercise = db
      .prepare(
        `SELECT id, name, muscle_group AS muscleGroup, category, created_at AS createdAt
         FROM exercises
         WHERE id = ?`
      )
      .get(result.lastInsertRowid);

    res.status(201).json({ exercise });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      return res.status(409).json({ message: "That exercise already exists." });
    }

    return res.status(500).json({ message: "Could not create exercise." });
  }
});

module.exports = router;
