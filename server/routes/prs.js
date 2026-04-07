const express = require("express");
const db = require("../db/database");

const router = express.Router();

router.get("/recent", (req, res) => {
  const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 5));

  const workoutExerciseSummaries = db
    .prepare(
      `SELECT
         ws.id AS workoutId,
         ws.title,
         ws.workout_date AS workoutDate,
         e.id AS exerciseId,
         e.name AS exerciseName,
         MIN(we.exercise_order) AS exerciseOrder,
         MAX(sl.weight) AS topWeight
       FROM workout_sessions ws
       JOIN workout_exercises we ON we.workout_session_id = ws.id
       JOIN exercises e ON e.id = we.exercise_id
       JOIN set_logs sl ON sl.workout_exercise_id = we.id
       GROUP BY ws.id, e.id
       ORDER BY ws.workout_date ASC, ws.id ASC, exerciseOrder ASC`
    )
    .all();

  const bestByExercise = new Map();
  const prEvents = [];

  workoutExerciseSummaries.forEach((entry) => {
    const currentTopWeight = Number(entry.topWeight || 0);
    const previousBest = bestByExercise.has(entry.exerciseId)
      ? Number(bestByExercise.get(entry.exerciseId))
      : 0;

    if (currentTopWeight > previousBest) {
      bestByExercise.set(entry.exerciseId, currentTopWeight);
      prEvents.push({
        workoutId: entry.workoutId,
        title: entry.title,
        workoutDate: entry.workoutDate,
        exerciseId: entry.exerciseId,
        exerciseName: entry.exerciseName,
        weight: currentTopWeight
      });
    }
  });

  res.json({
    recentPrs: prEvents.slice(-limit).reverse(),
    totalPrs: prEvents.length
  });
});

module.exports = router;
