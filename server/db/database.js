const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "workout-tracker.db");
const schemaPath = path.join(__dirname, "schema.sql");

if (!fs.existsSync(__dirname)) {
  fs.mkdirSync(__dirname, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(fs.readFileSync(schemaPath, "utf8"));

const seedExercises = [
  ["Bench Press", "Chest", "Push"],
  ["Incline Dumbbell Press", "Chest", "Push"],
  ["Overhead Press", "Shoulders", "Push"],
  ["Lat Pulldown", "Back", "Pull"],
  ["Barbell Row", "Back", "Pull"],
  ["Bicep Curl", "Arms", "Pull"],
  ["Squat", "Legs", "Legs"],
  ["Leg Press", "Legs", "Legs"],
  ["Romanian Deadlift", "Hamstrings", "Legs"],
  ["Calf Raise", "Calves", "Legs"],
  ["Cable Fly", "Chest", "Push"],
  ["Tricep Pushdown", "Arms", "Push"]
];

const count = db.prepare("SELECT COUNT(*) AS total FROM exercises").get().total;
if (count === 0) {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO exercises (name, muscle_group, category) VALUES (?, ?, ?)"
  );

  const seedTransaction = db.transaction(() => {
    for (const exercise of seedExercises) {
      insert.run(exercise[0], exercise[1], exercise[2]);
    }
  });

  seedTransaction();
}

module.exports = db;
