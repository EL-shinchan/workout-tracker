const express = require("express");
const db = require("../db/database");

const router = express.Router();

router.get("/exercise/:exerciseId", (req, res) => {
  const exerciseId = Number(req.params.exerciseId);

  const exercise = db
    .prepare(
      `SELECT id, name, muscle_group AS muscleGroup, category, created_at AS createdAt
       FROM exercises
       WHERE id = ?`
    )
    .get(exerciseId);

  if (!exercise) {
    return res.status(404).json({ message: "Exercise not found." });
  }

  const rawSummary = db
    .prepare(
      `SELECT
         ws.id AS workoutId,
         ws.title,
         ws.workout_date AS workoutDate,
         MAX(sl.weight) AS topWeight,
         COALESCE(SUM(sl.weight * sl.reps), 0) AS totalVolume,
         COALESCE(SUM(sl.reps), 0) AS totalReps,
         COUNT(sl.id) AS setCount
       FROM workout_sessions ws
       JOIN workout_exercises we ON we.workout_session_id = ws.id
       JOIN set_logs sl ON sl.workout_exercise_id = we.id
       WHERE we.exercise_id = ?
       GROUP BY ws.id
       ORDER BY ws.workout_date ASC, ws.id ASC`
    )
    .all(exerciseId);

  let runningBestWeight = 0;
  let allTimeBest = null;

  const summary = rawSummary.map((entry, index) => {
    const topWeight = Number(entry.topWeight || 0);
    const isPr = topWeight > runningBestWeight;

    if (isPr) {
      runningBestWeight = topWeight;
      allTimeBest = {
        weight: topWeight,
        workoutDate: entry.workoutDate,
        title: entry.title,
        workoutId: entry.workoutId,
        chartIndex: index
      };
    }

    return {
      ...entry,
      topWeight,
      totalVolume: Number(entry.totalVolume || 0),
      isPr
    };
  });

  const rawHistory = db
    .prepare(
      `SELECT
         ws.id AS workoutId,
         ws.title,
         ws.workout_date AS workoutDate,
         we.id AS workoutExerciseId,
         we.exercise_order AS exerciseOrder,
         we.notes AS exerciseNotes,
         sl.id AS setLogId,
         sl.set_number AS setNumber,
         sl.weight,
         sl.reps,
         sl.notes
       FROM workout_sessions ws
       JOIN workout_exercises we ON we.workout_session_id = ws.id
       JOIN set_logs sl ON sl.workout_exercise_id = we.id
       WHERE we.exercise_id = ?
       ORDER BY ws.workout_date DESC, ws.id DESC, sl.set_number ASC`
    )
    .all(exerciseId);

  const prWorkoutIds = new Set(
    summary.filter((entry) => entry.isPr).map((entry) => Number(entry.workoutId))
  );

  const groupedHistory = [];
  const historyMap = new Map();

  rawHistory.forEach((row) => {
    if (!historyMap.has(row.workoutId)) {
      const entry = {
        workoutId: row.workoutId,
        title: row.title,
        workoutDate: row.workoutDate,
        exerciseNotes: row.exerciseNotes,
        isPr: prWorkoutIds.has(Number(row.workoutId)),
        isCurrentAllTimeBest: allTimeBest ? Number(allTimeBest.workoutId) === Number(row.workoutId) : false,
        sets: []
      };
      historyMap.set(row.workoutId, entry);
      groupedHistory.push(entry);
    }

    historyMap.get(row.workoutId).sets.push({
      setNumber: row.setNumber,
      weight: row.weight,
      reps: row.reps,
      notes: row.notes
    });
  });

  res.json({
    exercise,
    summary,
    allTimeBest,
    chartData: {
      labels: summary.map((entry) => entry.workoutDate),
      topWeight: summary.map((entry) => entry.topWeight),
      totalVolume: summary.map((entry) => entry.totalVolume),
      prPointIndex: allTimeBest ? allTimeBest.chartIndex : null
    },
    history: groupedHistory
  });
});

module.exports = router;
