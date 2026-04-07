const express = require("express");
const db = require("../db/database");

const router = express.Router();

function sanitizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

router.get("/", (req, res) => {
  const workouts = db
    .prepare(
      `SELECT
         ws.id,
         ws.title,
         ws.workout_date AS workoutDate,
         ws.notes,
         ws.created_at AS createdAt,
         COUNT(DISTINCT we.id) AS exerciseCount,
         COUNT(sl.id) AS setCount,
         COALESCE(SUM(sl.weight * sl.reps), 0) AS totalVolume
       FROM workout_sessions ws
       LEFT JOIN workout_exercises we ON we.workout_session_id = ws.id
       LEFT JOIN set_logs sl ON sl.workout_exercise_id = we.id
       GROUP BY ws.id
       ORDER BY ws.workout_date DESC, ws.id DESC`
    )
    .all();

  res.json({ workouts });
});

router.get("/:id", (req, res) => {
  const workoutId = Number(req.params.id);

  const workout = db
    .prepare(
      `SELECT id, title, workout_date AS workoutDate, notes, created_at AS createdAt
       FROM workout_sessions
       WHERE id = ?`
    )
    .get(workoutId);

  if (!workout) {
    return res.status(404).json({ message: "Workout not found." });
  }

  const workoutExercises = db
    .prepare(
      `SELECT
         we.id AS workoutExerciseId,
         we.exercise_order AS exerciseOrder,
         we.notes,
         e.id AS exerciseId,
         e.name,
         e.muscle_group AS muscleGroup,
         e.category
       FROM workout_exercises we
       JOIN exercises e ON e.id = we.exercise_id
       WHERE we.workout_session_id = ?
       ORDER BY we.exercise_order ASC`
    )
    .all(workoutId);

  const getSets = db.prepare(
    `SELECT
       id,
       set_number AS setNumber,
       weight,
       reps,
       notes
     FROM set_logs
     WHERE workout_exercise_id = ?
     ORDER BY set_number ASC`
  );

  const exercises = workoutExercises.map((exercise) => ({
    ...exercise,
    sets: getSets.all(exercise.workoutExerciseId)
  }));

  res.json({ workout: { ...workout, exercises } });
});

router.post("/", (req, res) => {
  const title = String(req.body.title || "").trim();
  const workoutDate = String(req.body.workoutDate || "").trim();
  const notes = String(req.body.notes || "").trim();
  const exercises = Array.isArray(req.body.exercises) ? req.body.exercises : [];

  if (!title) {
    return res.status(400).json({ message: "Workout title is required." });
  }

  if (!workoutDate) {
    return res.status(400).json({ message: "Workout date is required." });
  }

  if (exercises.length === 0) {
    return res.status(400).json({ message: "Add at least one exercise." });
  }

  try {
    const createWorkout = db.transaction(() => {
      const workoutResult = db
        .prepare(
          `INSERT INTO workout_sessions (title, workout_date, notes)
           VALUES (?, ?, ?)`
        )
        .run(title, workoutDate, notes);

      const workoutId = Number(workoutResult.lastInsertRowid);
      const findExerciseById = db.prepare(`SELECT id, name FROM exercises WHERE id = ?`);
      const findExerciseByName = db.prepare(`SELECT id, name FROM exercises WHERE name = ? COLLATE NOCASE`);
      const getPreviousBestWeight = db.prepare(
        `SELECT COALESCE(MAX(sl.weight), 0) AS topWeight
         FROM workout_exercises we
         JOIN set_logs sl ON sl.workout_exercise_id = we.id
         WHERE we.exercise_id = ?`
      );
      const insertExercise = db.prepare(
        `INSERT INTO exercises (name, muscle_group, category)
         VALUES (?, ?, ?)`
      );
      const insertWorkoutExercise = db.prepare(
        `INSERT INTO workout_exercises (workout_session_id, exercise_id, exercise_order, notes)
         VALUES (?, ?, ?, ?)`
      );
      const insertSet = db.prepare(
        `INSERT INTO set_logs (workout_exercise_id, set_number, weight, reps, notes)
         VALUES (?, ?, ?, ?, ?)`
      );

      const previousBestByExercise = new Map();
      const workoutBestByExercise = new Map();
      const exerciseNamesById = new Map();

      exercises.forEach((exercise, exerciseIndex) => {
        const setList = Array.isArray(exercise.sets) ? exercise.sets : [];

        if (setList.length === 0) {
          throw new Error(`Exercise ${exerciseIndex + 1} must have at least one set.`);
        }

        let exerciseId = exercise.exerciseId ? Number(exercise.exerciseId) : null;
        let exerciseName = "";

        if (exerciseId) {
          const existingExercise = findExerciseById.get(exerciseId);
          if (!existingExercise) {
            throw new Error(`Selected exercise ${exerciseId} was not found.`);
          }

          exerciseName = existingExercise.name;
        } else {
          const requestedExerciseName = String(exercise.name || "").trim();
          const muscleGroup = String(exercise.muscleGroup || "").trim();
          const category = String(exercise.category || "").trim();

          if (!requestedExerciseName) {
            throw new Error(`Exercise ${exerciseIndex + 1} needs a name.`);
          }

          const existingByName = findExerciseByName.get(requestedExerciseName);
          if (existingByName) {
            exerciseId = existingByName.id;
            exerciseName = existingByName.name;
          } else {
            exerciseId = Number(insertExercise.run(requestedExerciseName, muscleGroup, category).lastInsertRowid);
            exerciseName = requestedExerciseName;
          }
        }

        exerciseNamesById.set(exerciseId, exerciseName);

        if (!previousBestByExercise.has(exerciseId)) {
          const previousBestWeight = Number(getPreviousBestWeight.get(exerciseId).topWeight || 0);
          previousBestByExercise.set(exerciseId, previousBestWeight);
        }

        const workoutExerciseId = Number(
          insertWorkoutExercise.run(
            workoutId,
            exerciseId,
            exerciseIndex + 1,
            String(exercise.notes || "").trim()
          ).lastInsertRowid
        );

        let currentExerciseTopWeight = workoutBestByExercise.get(exerciseId) || 0;

        setList.forEach((set, setIndex) => {
          const weight = sanitizeNumber(set.weight);
          const reps = sanitizeNumber(set.reps);
          const setNotes = String(set.notes || "").trim();

          if (!Number.isFinite(weight) || weight <= 0) {
            throw new Error(`Set ${setIndex + 1} in exercise ${exerciseIndex + 1} needs a valid weight.`);
          }

          if (!Number.isFinite(reps) || reps <= 0) {
            throw new Error(`Set ${setIndex + 1} in exercise ${exerciseIndex + 1} needs valid reps.`);
          }

          insertSet.run(workoutExerciseId, setIndex + 1, weight, Math.round(reps), setNotes);
          currentExerciseTopWeight = Math.max(currentExerciseTopWeight, weight);
        });

        workoutBestByExercise.set(exerciseId, currentExerciseTopWeight);
      });

      const newPrs = [];

      workoutBestByExercise.forEach((topWeight, exerciseId) => {
        const previousBestWeight = Number(previousBestByExercise.get(exerciseId) || 0);

        if (topWeight > previousBestWeight) {
          newPrs.push({
            exerciseId,
            exerciseName: exerciseNamesById.get(exerciseId),
            weight: topWeight,
            workoutDate
          });
        }
      });

      return { workoutId, newPrs };
    });

    const result = createWorkout();
    const createdWorkout = db
      .prepare(
        `SELECT id, title, workout_date AS workoutDate, notes, created_at AS createdAt
         FROM workout_sessions
         WHERE id = ?`
      )
      .get(result.workoutId);

    res.status(201).json({ workout: createdWorkout, newPrs: result.newPrs });
  } catch (error) {
    res.status(400).json({ message: error.message || "Could not save workout." });
  }
});

router.delete("/:id", (req, res) => {
  const workoutId = Number(req.params.id);
  const existingWorkout = db.prepare(`SELECT id FROM workout_sessions WHERE id = ?`).get(workoutId);

  if (!existingWorkout) {
    return res.status(404).json({ message: "Workout not found." });
  }

  db.prepare(`DELETE FROM workout_sessions WHERE id = ?`).run(workoutId);
  return res.json({ message: "Workout deleted." });
});

module.exports = router;
