const db = require("../db/database");
const { ensureUserSchema } = require("./userStore");

const MACROS = ["calories", "protein", "carbs", "fat"];
const MEAL_TYPES = new Set(["breakfast", "lunch", "dinner", "snack"]);

function ensureNutritionSchema() {
  ensureUserSchema();
  db.exec(`
    CREATE TABLE IF NOT EXISTS nutrition_goals (
      user_id INTEGER PRIMARY KEY,
      calories_goal REAL DEFAULT 0,
      protein_goal REAL DEFAULT 0,
      carbs_goal REAL DEFAULT 0,
      fat_goal REAL DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS nutrition_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      entry_date TEXT NOT NULL,
      meal_type TEXT NOT NULL DEFAULT 'snack',
      food_name TEXT NOT NULL,
      calories REAL DEFAULT 0,
      protein REAL DEFAULT 0,
      carbs REAL DEFAULT 0,
      fat REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      is_estimate INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_nutrition_entries_user_date ON nutrition_entries(user_id, entry_date DESC, id DESC);
  `);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function roundMacro(value) {
  return Math.round(toNumber(value) * 10) / 10;
}

function isDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDate(value) {
  const date = String(value || "").trim();
  return isDateString(date) ? date : todayString();
}

function normalizeMealType(value) {
  const mealType = String(value || "snack").trim().toLowerCase();
  return MEAL_TYPES.has(mealType) ? mealType : "snack";
}

function emptyGoals() {
  return {
    caloriesGoal: 0,
    proteinGoal: 0,
    carbsGoal: 0,
    fatGoal: 0
  };
}

function getGoals(userId) {
  ensureNutritionSchema();
  const row = db
    .prepare(
      `SELECT
         calories_goal AS caloriesGoal,
         protein_goal AS proteinGoal,
         carbs_goal AS carbsGoal,
         fat_goal AS fatGoal,
         updated_at AS updatedAt
       FROM nutrition_goals
       WHERE user_id = ?`
    )
    .get(Number(userId));

  if (!row) {
    return emptyGoals();
  }

  return {
    caloriesGoal: roundMacro(row.caloriesGoal),
    proteinGoal: roundMacro(row.proteinGoal),
    carbsGoal: roundMacro(row.carbsGoal),
    fatGoal: roundMacro(row.fatGoal),
    updatedAt: row.updatedAt
  };
}

function saveGoals(userId, goals) {
  ensureNutritionSchema();
  const payload = {
    caloriesGoal: roundMacro(goals.caloriesGoal),
    proteinGoal: roundMacro(goals.proteinGoal),
    carbsGoal: roundMacro(goals.carbsGoal),
    fatGoal: roundMacro(goals.fatGoal)
  };

  db.prepare(
    `INSERT INTO nutrition_goals (user_id, calories_goal, protein_goal, carbs_goal, fat_goal, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       calories_goal = excluded.calories_goal,
       protein_goal = excluded.protein_goal,
       carbs_goal = excluded.carbs_goal,
       fat_goal = excluded.fat_goal,
       updated_at = CURRENT_TIMESTAMP`
  ).run(
    Number(userId),
    payload.caloriesGoal,
    payload.proteinGoal,
    payload.carbsGoal,
    payload.fatGoal
  );

  return getGoals(userId);
}

function sanitizeEntry(entry) {
  return {
    ...entry,
    calories: roundMacro(entry.calories),
    protein: roundMacro(entry.protein),
    carbs: roundMacro(entry.carbs),
    fat: roundMacro(entry.fat),
    isEstimate: Boolean(entry.isEstimate)
  };
}

function createEntry(userId, body) {
  ensureNutritionSchema();
  const entryDate = normalizeDate(body.entryDate);
  const mealType = normalizeMealType(body.mealType);
  const foodName = String(body.foodName || "").trim();
  const notes = String(body.notes || "").trim();

  if (!foodName) {
    throw new Error("Food name is required.");
  }

  const result = db.prepare(
    `INSERT INTO nutrition_entries
       (user_id, entry_date, meal_type, food_name, calories, protein, carbs, fat, notes, is_estimate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    Number(userId),
    entryDate,
    mealType,
    foodName,
    roundMacro(body.calories),
    roundMacro(body.protein),
    roundMacro(body.carbs),
    roundMacro(body.fat),
    notes,
    body.isEstimate ? 1 : 0
  );

  return sanitizeEntry(getEntry(userId, Number(result.lastInsertRowid)));
}

function getEntry(userId, entryId) {
  ensureNutritionSchema();
  return db.prepare(
    `SELECT
       id,
       entry_date AS entryDate,
       meal_type AS mealType,
       food_name AS foodName,
       calories,
       protein,
       carbs,
       fat,
       notes,
       is_estimate AS isEstimate,
       created_at AS createdAt
     FROM nutrition_entries
     WHERE id = ? AND user_id = ?`
  ).get(Number(entryId), Number(userId));
}

function listEntriesForDay(userId, date) {
  ensureNutritionSchema();
  return db.prepare(
    `SELECT
       id,
       entry_date AS entryDate,
       meal_type AS mealType,
       food_name AS foodName,
       calories,
       protein,
       carbs,
       fat,
       notes,
       is_estimate AS isEstimate,
       created_at AS createdAt
     FROM nutrition_entries
     WHERE user_id = ? AND entry_date = ?
     ORDER BY
       CASE meal_type
         WHEN 'breakfast' THEN 1
         WHEN 'lunch' THEN 2
         WHEN 'dinner' THEN 3
         ELSE 4
       END,
       id ASC`
  ).all(Number(userId), normalizeDate(date)).map(sanitizeEntry);
}

function totalsForEntries(entries) {
  return entries.reduce((totals, entry) => {
    MACROS.forEach((macro) => {
      totals[macro] = roundMacro(totals[macro] + toNumber(entry[macro]));
    });
    return totals;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

function remainingForGoals(goals, totals) {
  return {
    calories: roundMacro((goals.caloriesGoal || 0) - totals.calories),
    protein: roundMacro((goals.proteinGoal || 0) - totals.protein),
    carbs: roundMacro((goals.carbsGoal || 0) - totals.carbs),
    fat: roundMacro((goals.fatGoal || 0) - totals.fat)
  };
}

function daySummary(userId, date) {
  const selectedDate = normalizeDate(date);
  const goals = getGoals(userId);
  const entries = listEntriesForDay(userId, selectedDate);
  const totals = totalsForEntries(entries);
  const remaining = remainingForGoals(goals, totals);

  return {
    date: selectedDate,
    goals,
    totals,
    remaining,
    entries
  };
}

function deleteEntry(userId, entryId) {
  ensureNutritionSchema();
  const result = db
    .prepare(`DELETE FROM nutrition_entries WHERE id = ? AND user_id = ?`)
    .run(Number(entryId), Number(userId));

  return result.changes > 0;
}

module.exports = {
  MACROS,
  MEAL_TYPES,
  ensureNutritionSchema,
  normalizeDate,
  normalizeMealType,
  roundMacro,
  getGoals,
  saveGoals,
  createEntry,
  daySummary,
  deleteEntry
};
